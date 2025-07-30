import type { Express } from "express";
import { checkRateLimit, incrementUsage, getUsageStats, rateLimitMiddleware } from "../services/rateLimiting";
import { extractYouTubeTranscript } from "../services/contentExtraction";
import { extractTextFromImage, extractTextFromMultipleImages } from "../services/ocrService";
import { extractTextFromPDF, isPDFFile, validatePDFFile } from "../services/pdfService";
import { extractTextFromDocument, isDocumentFile, validateDocumentFile } from "../services/documentService";
import { generateQuestions, generateQuestionPreview, generateQuestionsWithImage, checkAIServiceHealth } from "../services/hybridAIService-new";
import { validateInput } from "../validation";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Setup multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: 'temp_uploads/',
    filename: (req, file, cb) => {
      // Preserve file extension for proper OCR processing
      const ext = path.extname(file.originalname).toLowerCase();
      const randomName = crypto.randomBytes(16).toString('hex');
      cb(null, randomName + ext);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

/**
 * Expand a short topic into a fuller content description for better question generation
 */
function expandTopicForQuestions(topic: string): string {
  const cleanTopic = topic.trim();
  
  // If it's already a question or instruction, return as is
  if (cleanTopic.includes('?') || 
      cleanTopic.toLowerCase().includes('create') || 
      cleanTopic.toLowerCase().includes('generate') ||
      cleanTopic.toLowerCase().includes('make a quiz') ||
      cleanTopic.length > 50) {
    return cleanTopic;
  }
  
  // Expand common historical topics
  const historicalTopics = {
    'world war 1': 'World War 1 (1914-1918), also known as the Great War, was a global war that involved most of the world\'s major powers. Key topics include causes, major battles, key figures, technology, and consequences.',
    'world war 2': 'World War 2 (1939-1945) was the deadliest conflict in human history involving the Axis and Allied powers. Important topics include causes, major campaigns, the Holocaust, key leaders like Hitler and Churchill, D-Day, Pearl Harbor, and the atomic bombs.',
    'civil war': 'The American Civil War (1861-1865) was fought between the Union and Confederate states over slavery and states\' rights. Key topics include causes, major battles, Abraham Lincoln, slavery, Reconstruction.',
    'american revolution': 'The American Revolution (1775-1783) was the war for independence from British rule. Important topics include causes, key battles, founding fathers, Declaration of Independence, and the Constitution.'
  };
  
  // Expand science topics
  const scienceTopics = {
    'photosynthesis': 'Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen. Key concepts include chloroplasts, chlorophyll, light and dark reactions, and the chemical equation.',
    'dna': 'DNA (Deoxyribonucleic Acid) is the genetic material that carries hereditary information. Topics include structure, replication, transcription, translation, mutations, and genetic inheritance.',
    'solar system': 'The Solar System consists of the Sun and celestial bodies orbiting it, including planets, moons, asteroids, and comets. Key topics include planet characteristics, orbits, and space exploration.',
    'cell biology': 'Cell biology studies the structure and function of cells, the basic units of life. Topics include cell organelles, cell division, membrane structure, and differences between prokaryotic and eukaryotic cells.'
  };
  
  // Check for direct matches (case insensitive)
  const lowerTopic = cleanTopic.toLowerCase();
  
  if (lowerTopic in historicalTopics) {
    return historicalTopics[lowerTopic as keyof typeof historicalTopics];
  }
  
  if (lowerTopic in scienceTopics) {
    return scienceTopics[lowerTopic as keyof typeof scienceTopics];
  }
  
  // Generic expansion for unmatched topics
  if (cleanTopic.length < 15) {
    return `${cleanTopic}: This topic covers key concepts, important facts, historical context, major figures, and significant events related to ${cleanTopic}. Questions will test understanding of fundamental principles and important details.`;
  }
  
  return cleanTopic;
}

// Validation schemas
const linkExtractionSchema = z.object({
  url: z.string().url('Invalid URL format').refine(
    (url) => url.includes('youtube.com') || url.includes('youtu.be'),
    'Only YouTube links are supported'
  ),
  type: z.enum(['youtube']).optional()
});

const questionGenerationSchema = z.object({
  content: z.string().min(20, 'Content too short (minimum 20 characters)').max(50000, 'Content too long'),
  numberOfQuestions: z.number().min(5).max(50),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  language: z.string(),
  contentType: z.enum(['document', 'youtube', 'topic', 'mixed']).optional(),
  contentQuality: z.number().min(1).max(10).optional()
});

/**
 * Register auto-create related routes
 */
export function registerAutoCreateRoutes(app: Express) {
  
  /**
   * GET /api/auto-create/usage-status
   * Check current usage status for rate limiting
   */
  app.get("/api/auto-create/usage-status", async (req, res) => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const rateLimitResult = await checkRateLimit(ipAddress);
      
      res.json({
        success: true,
        data: {
          allowed: rateLimitResult.allowed,
          currentUsage: rateLimitResult.currentUsage,
          limit: rateLimitResult.limit,
          remainingUses: rateLimitResult.remainingUses,
          resetTime: rateLimitResult.resetTime,
          canUseFeature: rateLimitResult.allowed
        }
      });
    } catch (error) {
      console.error('Error checking usage status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check usage status',
        message: 'Unable to verify rate limit status'
      });
    }
  });
  
  /**
   * POST /api/auto-create/increment-usage
   * Increment usage count (called when user successfully uses auto-create)
   */
  app.post("/api/auto-create/increment-usage", async (req, res) => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const rateLimitResult = await incrementUsage(ipAddress);
      
      res.json({
        success: true,
        data: {
          currentUsage: rateLimitResult.currentUsage,
          limit: rateLimitResult.limit,
          remainingUses: rateLimitResult.remainingUses,
          resetTime: rateLimitResult.resetTime,
          canUseFeature: rateLimitResult.allowed
        }
      });
    } catch (error) {
      if ((error as any).code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: `You've reached your daily limit. Please try again tomorrow.`,
          data: {
            currentUsage: (error as any).currentUsage,
            limit: (error as any).limit,
            resetTime: (error as any).resetTime,
            remainingUses: 0,
            canUseFeature: false
          }
        });
      }
      
      console.error('Error incrementing usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update usage',
        message: 'Unable to track usage'
      });
    }
  });
  
  /**
   * GET /api/auto-create/usage-stats
   * Get detailed usage statistics for an IP
   */
  app.get("/api/auto-create/usage-stats", async (req, res) => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const stats = await getUsageStats(ipAddress);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get usage statistics',
        message: 'Unable to retrieve usage data'
      });
    }
  });
  
  /**
   * POST /api/auto-create/extract-link
   * Extract content from YouTube videos only
   */
  app.post("/api/auto-create/extract-link", validateInput(linkExtractionSchema), async (req, res) => {
    try {
      const { url, type } = (req as any).validatedBody;
      
      // Only allow YouTube links
      if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        return res.status(400).json({
          success: false,
          error: 'Only YouTube links are supported',
          message: 'For other content, please copy and paste the text into the topic/prompt field.'
        });
      }
      
      const result = await extractYouTubeTranscript(url);
      
      res.json({
        success: result.success,
        data: {
          content: result.content,
          contentType: result.contentType,
          quality: result.quality,
          metadata: result.metadata
        }
      });
    } catch (error) {
      console.error('YouTube extraction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract content from YouTube link',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/auto-create/ocr-process
   * Process uploaded files with OCR
   */
  app.post("/api/auto-create/ocr-process", upload.array('files', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
          message: 'Please upload at least one file'
        });
      }
      
      // Process single or multiple files
      let result;
      if (files.length === 1) {
        result = await extractTextFromImage(files[0].path);
        
        // Clean up uploaded file
        fs.unlinkSync(files[0].path);
        
        res.json({
          success: result.success,
          data: {
            content: result.text,
            quality: result.quality,
            confidence: result.confidence,
            metadata: result.metadata
          }
        });
      } else {
        const filePaths = files.map(f => f.path);
        result = await extractTextFromMultipleImages(filePaths);
        
        // Clean up uploaded files
        filePaths.forEach(path => {
          try {
            fs.unlinkSync(path);
          } catch (error) {
            console.warn('Failed to delete temp file:', path);
          }
        });
        
        res.json({
          success: result.success,
          data: {
            content: result.combinedText,
            quality: result.overallQuality,
            results: result.results,
            totalProcessingTime: result.totalProcessingTime
          }
        });
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      
      // Clean up any uploaded files in case of error
      if (req.files) {
        (req.files as Express.Multer.File[]).forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.warn('Failed to cleanup file:', file.path);
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to process files with OCR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/auto-create/generate-questions
   * Generate quiz questions using AI
   */
  app.post("/api/auto-create/generate-questions", rateLimitMiddleware(), validateInput(questionGenerationSchema), async (req, res) => {
    try {
      const requestData = (req as any).validatedBody;
      
      const result = await generateQuestions(requestData);
      
      if (result.success) {
        // Increment usage count on successful generation
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        await incrementUsage(ipAddress);
      }
      
      res.json({
        success: result.success,
        data: {
          questions: result.questions,
          metadata: result.metadata
        }
      });
    } catch (error) {
      console.error('Question generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate questions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/auto-create/generate-preview
   * Generate a preview of questions (fewer questions for quick feedback)
   */
  app.post("/api/auto-create/generate-preview", validateInput(questionGenerationSchema), async (req, res) => {
    try {
      const requestData = (req as any).validatedBody;
      
      const result = await generateQuestionPreview(requestData);
      
      res.json({
        success: result.success,
        data: {
          questions: result.questions,
          metadata: result.metadata
        }
      });
    } catch (error) {
      console.error('Question preview generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate question preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/auto-create/process-content
   * Comprehensive endpoint that processes multiple content sources and generates questions
   */
  app.post("/api/auto-create/process-content", rateLimitMiddleware(), upload.array('files', 5), async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { topicPrompt, linkUrl, numberOfQuestions, difficulty, language } = req.body;
      const files = req.files as Express.Multer.File[];
      
      // Validate required fields
      if (!numberOfQuestions || !difficulty || !language) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'numberOfQuestions, difficulty, and language are required'
        });
      }
      
      // Check that at least one content source is provided
      const hasFiles = files && files.length > 0;
      const hasTopic = topicPrompt && topicPrompt.trim();
      const hasLink = linkUrl && linkUrl.trim();
      
      if (!hasFiles && !hasTopic && !hasLink) {
        return res.status(400).json({
          success: false,
          error: 'No content provided',
          message: 'Please provide at least one content source: files, topic, or link'
        });
      }
      
      const contentParts: string[] = [];
      const processingResults: any[] = [];
      let overallQuality = 0;
      let qualityCount = 0;
      
      // Process uploaded files with appropriate service (PDF, Documents, Images)
      if (hasFiles) {
        try {
          const filePaths = files.map(f => f.path);
          
          // Separate files by type: PDFs, Documents (TXT/DOC/DOCX), Images
          const pdfFiles = filePaths.filter(isPDFFile);
          const documentFiles = filePaths.filter(isDocumentFile);
          const imageFiles = filePaths.filter(path => !isPDFFile(path) && !isDocumentFile(path));
          
          console.log(`📁 File breakdown: ${pdfFiles.length} PDFs, ${documentFiles.length} documents, ${imageFiles.length} images`);
          
          // Process PDFs with PDF service
          for (const pdfPath of pdfFiles) {
            try {
              console.log('📄 Processing PDF:', pdfPath);
              const pdfResult = await extractTextFromPDF(pdfPath, 10);
              
              if (pdfResult.success && pdfResult.text.trim()) {
                contentParts.push(pdfResult.text);
                overallQuality += 0.9; // PDFs generally have high quality text
                qualityCount++;
              }
              
              processingResults.push({
                type: 'pdf',
                success: pdfResult.success,
                content: pdfResult.text,
                quality: 0.9,
                processingTime: pdfResult.processingTime,
                pageCount: pdfResult.pageCount
              });
              
            } catch (pdfError) {
              console.error('❌ PDF processing failed:', pdfError);
              processingResults.push({
                type: 'pdf',
                success: false,
                error: pdfError instanceof Error ? pdfError.message : 'PDF processing failed'
              });
            }
          }
          
          // Process Documents (TXT/DOC/DOCX) with document service
          for (const docPath of documentFiles) {
            try {
              console.log('📄 Processing document:', docPath);
              const docResult = await extractTextFromDocument(docPath);
              
              if (docResult.success && docResult.text.trim()) {
                contentParts.push(docResult.text);
                overallQuality += 0.95; // Text documents have excellent quality
                qualityCount++;
              }
              
              processingResults.push({
                type: 'document',
                success: docResult.success,
                content: docResult.text,
                quality: 0.95,
                processingTime: docResult.processingTime,
                wordCount: docResult.wordCount,
                fileType: docResult.fileType
              });
              
            } catch (docError) {
              console.error('❌ Document processing failed:', docError);
              processingResults.push({
                type: 'document',
                success: false,
                error: docError instanceof Error ? docError.message : 'Document processing failed'
              });
            }
          }
          
          // Process images with OCR service
          if (imageFiles.length > 0) {
            const ocrResult = await extractTextFromMultipleImages(imageFiles);
            
            if (ocrResult.success && ocrResult.combinedText.trim()) {
              contentParts.push(ocrResult.combinedText);
              overallQuality += ocrResult.overallQuality;
              qualityCount++;
            }
            
            processingResults.push({
              type: 'images',
              success: ocrResult.success,
              content: ocrResult.combinedText,
              quality: ocrResult.overallQuality,
              processingTime: ocrResult.totalProcessingTime
            });
          }
          
          // Clean up uploaded files
          filePaths.forEach(path => {
            try {
              fs.unlinkSync(path);
            } catch (error) {
              console.warn('Failed to delete temp file:', path);
            }
          });
        } catch (error) {
          processingResults.push({
            type: 'files',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Process link content (YouTube only)
      if (hasLink) {
        try {
          let linkResult;
          if (linkUrl.includes('youtube.com') || linkUrl.includes('youtu.be')) {
            linkResult = await extractYouTubeTranscript(linkUrl);
            
            if (linkResult.success && linkResult.content.trim()) {
              contentParts.push(linkResult.content);
              overallQuality += linkResult.quality;
              qualityCount++;
            }
            
            processingResults.push({
              type: 'youtube',
              success: linkResult.success,
              content: linkResult.content,
              quality: linkResult.quality,
              contentType: linkResult.contentType,
              metadata: linkResult.metadata
            });
          } else {
            // Reject non-YouTube links
            processingResults.push({
              type: 'link',
              success: false,
              error: 'Only YouTube links are supported. For other content, please copy and paste the text into the topic/prompt field.'
            });
          }
        } catch (error) {
          processingResults.push({
            type: 'link',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Add topic prompt with automatic expansion for short topics
      if (hasTopic) {
        let expandedTopic = topicPrompt.trim();
        
        // If the topic is very short (less than 20 characters), expand it for better question generation
        if (expandedTopic.length < 20) {
          expandedTopic = expandTopicForQuestions(expandedTopic);
          console.log(`📝 Expanded short topic "${topicPrompt.trim()}" to: "${expandedTopic}"`);
        }
        
        contentParts.push(expandedTopic);
        overallQuality += 7; // Assume decent quality for user-provided topics
        qualityCount++;
        
        processingResults.push({
          type: 'topic',
          success: true,
          content: expandedTopic,
          originalTopic: topicPrompt.trim(),
          expanded: expandedTopic !== topicPrompt.trim(),
          quality: 7
        });
      }
      
      // Check if we have any content
      if (contentParts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No content extracted',
          message: 'Failed to extract content from any of the provided sources',
          processingResults
        });
      }
      
      // Combine all content
      const combinedContent = contentParts.join('\n\n');
      const avgQuality = qualityCount > 0 ? overallQuality / qualityCount : 5;
      
      // Determine content type
      let contentType: 'document' | 'youtube' | 'topic' | 'mixed' = 'topic';
      if (processingResults.length > 1) {
        contentType = 'mixed';
      } else if (processingResults.length === 1) {
        const result = processingResults[0];
        if (result.type === 'pdf' || result.type === 'document' || result.type === 'images') {
          contentType = 'document';
        } else if (result.type === 'youtube') {
          contentType = 'youtube';
        } else {
          contentType = 'topic';
        }
      }
      
      // Generate questions
      const questionRequest = {
        content: combinedContent,
        numberOfQuestions: parseInt(numberOfQuestions),
        difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
        language: language,
        contentType,
        contentQuality: avgQuality
      };
      
      console.log('🔥 ROUTE DEBUG: About to call generateQuestions with request:', {
        contentLength: questionRequest.content.length,
        numberOfQuestions: questionRequest.numberOfQuestions,
        difficulty: questionRequest.difficulty,
        language: questionRequest.language,
        contentType: questionRequest.contentType
      });
      
      const questionResult = await generateQuestions(questionRequest);
      
      console.log('🔥 ROUTE DEBUG: generateQuestions returned:', {
        success: questionResult.success,
        questionCount: questionResult.questions.length,
        error: questionResult.metadata.error
      });
      
      if (questionResult.success) {
        // Increment usage count on successful generation
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        await incrementUsage(ipAddress);
      }
      
      res.json({
        success: questionResult.success,
        data: {
          questions: questionResult.questions,
          metadata: {
            ...questionResult.metadata,
            totalProcessingTime: Date.now() - startTime,
            contentSources: processingResults.length,
            combinedContentLength: combinedContent.length,
            averageContentQuality: avgQuality
          },
          processingResults
        }
      });
      
    } catch (error) {
      console.error('Content processing error:', error);
      
      // Clean up any uploaded files in case of error
      if (req.files) {
        (req.files as Express.Multer.File[]).forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.warn('Failed to cleanup file:', file.path);
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to process content',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        errorCode: (() => {
          if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            if (errorMsg.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED';
            if (errorMsg.includes('youtube')) return 'YOUTUBE_EXTRACTION_FAILED';
            if (errorMsg.includes('unsupported image format')) return 'UNSUPPORTED_IMAGE_FORMAT';
            if (errorMsg.includes('content too short')) return 'CONTENT_TOO_SHORT';
            if (errorMsg.includes('api key') || errorMsg.includes('authentication')) return 'SERVICE_UNAVAILABLE';
            if (errorMsg.includes('timeout')) return 'PROCESSING_TIMEOUT';
          }
          return 'PROCESSING_ERROR';
        })(),
        userMessage: (() => {
          if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            if (errorMsg.includes('rate limit')) return 'AI service rate limit reached. Please try again in a few minutes.';
            if (errorMsg.includes('youtube')) return 'Unable to extract content from YouTube video. Please ensure the video is public and has captions.';
            if (errorMsg.includes('unsupported image format')) return 'Unsupported image format. Please use JPG, PNG, GIF, BMP, TIFF, or WebP images.';
            if (errorMsg.includes('content too short')) return 'Content is too short to generate questions. Please provide at least 20 characters.';
            if (errorMsg.includes('api key') || errorMsg.includes('authentication')) return 'Service temporarily unavailable. Please try again later.';
            if (errorMsg.includes('timeout')) return 'Processing timed out. Please try with smaller content.';
          }
          return 'An unexpected error occurred while processing your content.';
        })()
      });
    }
  });
  
  /**
   * GET /api/auto-create/ai-health
   * Check the health and availability of AI services
   */
  app.get("/api/auto-create/ai-health", async (req, res) => {
    try {
      const healthCheck = await checkAIServiceHealth();
      
      res.json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      console.error('AI health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check AI service health',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/auto-create/generate-from-image
   * Generate questions directly from image using Meta Llama Vision
   */
  app.post("/api/auto-create/generate-from-image", rateLimitMiddleware(), upload.single('image'), async (req, res) => {
    try {
      const { numberOfQuestions, difficulty, language, additionalContext } = req.body;
      const imageFile = req.file;
      
      if (!imageFile) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }
      
      // Convert image to base64
      const imageBuffer = fs.readFileSync(imageFile.path);
      const imageBase64 = imageBuffer.toString('base64');
      
      // Clean up the uploaded file
      fs.unlinkSync(imageFile.path);
      
      // Prepare request for image-based generation
      const requestData = {
        content: additionalContext || '',
        numberOfQuestions: parseInt(numberOfQuestions) || 5,
        difficulty: difficulty || 'Medium',
        language: language || 'English',
        contentType: 'document' as const,
        imageData: imageBase64
      };
      
      const result = await generateQuestionsWithImage(requestData);
      
      if (result.success) {
        // Increment usage count on successful generation
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        await incrementUsage(ipAddress);
      }
      
      res.json({
        success: result.success,
        data: {
          questions: result.questions,
          metadata: result.metadata
        }
      });
      
    } catch (error) {
      console.error('Image-based question generation error:', error);
      
      // Clean up uploaded file in case of error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup image file:', req.file.path);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate questions from image',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * Middleware for protecting auto-create endpoints
   * This can be used on routes that consume auto-create quota
   */
  app.use("/api/auto-create/generate-questions", rateLimitMiddleware());
  
  console.log('Auto-create routes registered successfully');
}

// Export middleware for use in other route files
export { rateLimitMiddleware };