import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertUserSchema, 
  insertQuizSchema, 
  insertQuestionSchema, 
  insertQuizAttemptSchema,
  questionAnswerSchema,
  quizzes,
  quizAttempts,
  questions
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { registerContactRoutes } from "./routes/contact";
import { registerAutoCreateRoutes } from "./routes/autoCreateRoutes";
import { requireAdmin } from "./auth";
import { 
  secureUserSchema, 
  secureQuizSchema, 
  secureQuestionSchema, 
  secureQuizAttemptSchema,
  checkRateLimit,
  rateLimits,
  validateInput 
} from "./validation";

// Setup dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup temporary upload directory for processing before sending to Cloudinary
const projectRoot = path.resolve(__dirname, '..');
const tempUploadDir = path.join(projectRoot, 'temp_uploads');

console.log('Project root:', projectRoot);
console.log('Temp upload directory:', tempUploadDir);

// Ensure temp directory exists
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
  console.log(`Created temp upload directory: ${tempUploadDir}`);
}

// Use multer with temporary storage
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    
    console.log(`New temp upload: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024 // Increased to 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      // @ts-ignore - Multer types aren't perfect
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Render and uptime monitoring
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Ping endpoint (alias for health check)
  app.get("/ping", (req, res) => {
    res.status(200).json({ 
      status: "pong",
      timestamp: new Date().toISOString()
    });
  });

  // Debug middleware to track all API requests
  app.use('/api', (req, res, next) => {
    console.log(`🔍 API Request: ${req.method} ${req.originalUrl} - params:`, req.params);
    next();
  });

  // User routes with security validation
  app.post("/api/users", validateInput(secureUserSchema), async (req, res) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Rate limiting
      if (!checkRateLimit(clientIp, rateLimits.createUser)) {
        return res.status(429).json({ 
          message: "Too many user creation attempts. Please try again later." 
        });
      }

      const userData = (req as any).validatedBody;
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Quiz routes with enhanced security
  app.post("/api/quizzes", validateInput(secureQuizSchema), async (req, res) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Rate limiting for quiz creation
      if (!checkRateLimit(clientIp, rateLimits.createQuiz)) {
        return res.status(429).json({ 
          message: "Too many quiz creation attempts. Please try again later." 
        });
      }

      const quizData = (req as any).validatedBody;
      
      console.log(`Creating quiz with creator name: "${quizData.creatorName}"`);
      
      const quiz = await storage.createQuiz(quizData);
      
      // Verify the quiz was created and is immediately readable
      console.log(`✅ Quiz created with ID: ${quiz.id}, verifying readability...`);
      try {
        const verificationQuiz = await storage.getQuiz(quiz.id);
        if (!verificationQuiz) {
          console.warn(`⚠️ Quiz ${quiz.id} was created but is not immediately readable`);
        } else {
          console.log(`✅ Quiz ${quiz.id} is immediately readable after creation`);
        }
      } catch (verifyError) {
        console.warn(`⚠️ Error verifying quiz ${quiz.id} readability:`, verifyError);
      }
      
      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });
  
  // Get all quizzes (ADMIN ONLY - secured for testing/debugging)
  app.get("/api/quizzes", requireAdmin, async (req, res) => {
    try {
      // Get all quizzes from the database
      const allQuizzes = await db.select().from(quizzes);
      res.json(allQuizzes);
    } catch (error) {
      console.error("Error fetching all quizzes:", error);
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.get("/api/quizzes/code/:accessCode", async (req, res) => {
    try {
      const accessCode = req.params.accessCode;
      const quiz = await storage.getQuizByAccessCode(accessCode);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Check if the quiz is expired (older than 7 days)
      const isExpired = storage.isQuizExpired(quiz);
      if (isExpired) {
        return res.status(410).json({ 
          message: "Quiz expired", 
          expired: true,
          detail: "This quiz has expired. Quizzes are available for 7 days after creation."
        });
      }
      
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });
  
  app.get("/api/quizzes/slug/:urlSlug", async (req, res) => {
    try {
      const urlSlug = req.params.urlSlug;
      console.log(`Looking up quiz with URL slug: "${urlSlug}"`);
      
      // First, try exact match
      let quiz = await storage.getQuizByUrlSlug(urlSlug);
      
      // If no exact match, try checking if the slug uses a different casing
      if (!quiz) {
        // Get all quizzes from the database
        const allQuizzesList = await db.select().from(quizzes);
        
        // Find a case-insensitive match
        const slugMatch = allQuizzesList.find((q: any) => 
          q.urlSlug.toLowerCase() === urlSlug.toLowerCase()
        );
        
        if (slugMatch) {
          quiz = slugMatch;
          console.log(`Found quiz with case-insensitive match: ${slugMatch.urlSlug}`);
        } else {
          console.log(`No quiz found with URL slug: "${urlSlug}"`);
          return res.status(404).json({ message: "Quiz not found" });
        }
      }
      
      // Check if the quiz is expired (older than 7 days)
      if (quiz) {
        const isExpired = storage.isQuizExpired(quiz);
        if (isExpired) {
          return res.status(410).json({ 
          message: "Quiz expired", 
          expired: true,
          detail: "This quiz has expired. Quizzes are available for 7 days after creation."
        });
        }
      }
      
      res.json(quiz);
    } catch (error) {
      console.error(`Error fetching quiz by slug "${req.params.urlSlug}":`, error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });
  
  // Get quiz by dashboard token
  app.get("/api/quizzes/dashboard/:token", async (req, res) => {
    try {
      const dashboardToken = req.params.token;
      console.log(`Looking up quiz with dashboard token: "${dashboardToken}"`);
      
      // Use the storage function to get the quiz by dashboard token
      const quiz = await storage.getQuizByDashboardToken(dashboardToken);
      
      if (!quiz) {
        console.log(`No quiz found with dashboard token: "${dashboardToken}"`);
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Check if the quiz is expired (older than 7 days)
      const isExpired = storage.isQuizExpired(quiz);
      if (isExpired) {
        return res.status(410).json({ 
          message: "Quiz expired", 
          expired: true,
          detail: "This quiz has expired. Quizzes are available for 7 days after creation."
        });
      }
      
      res.json(quiz);
    } catch (error) {
      console.error(`Error fetching quiz by dashboard token "${req.params.token}":`, error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });
  
  // Get quiz by ID
  app.get("/api/quizzes/:quizId", async (req, res) => {
    console.log(`🔍 GET /api/quizzes/:quizId handler started - quizId: ${req.params.quizId}`);
    try {
      const quizId = parseInt(req.params.quizId);
      console.log(`🔍 Parsed quizId: ${quizId}`);
      
      if (isNaN(quizId)) {
        console.log(`🔍 Invalid quiz ID: ${req.params.quizId}`);
        return res.status(400).json({ message: "Invalid quiz ID" });
      }
      
      console.log(`🔍 Calling storage.getQuiz(${quizId})`);
      
      // Add additional timeout at route level for safety
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Route timeout after 8 seconds for quiz ID ${quizId}`));
        }, 8000);
      });
      
      const quiz = await Promise.race([
        storage.getQuiz(quizId),
        timeoutPromise
      ]);
      
      console.log(`🔍 Storage result:`, quiz);
      
      if (!quiz) {
        console.log(`🔍 Quiz not found: ${quizId}`);
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Check if the quiz is expired (older than 7 days) - TEMPORARILY DISABLED FOR DEBUGGING
      const isExpired = storage.isQuizExpired(quiz);
      console.log(`🔍 Quiz expired check: ${isExpired}`);
      console.log(`🔍 Quiz data for debugging:`, JSON.stringify(quiz, null, 2));
      
      // TEMPORARILY COMMENTED OUT TO DEBUG THE QUIZ DATA
      // if (isExpired) {
      //   console.log(`🔍 Quiz ${quizId} is expired`);
      //   return res.status(410).json({ 
      //     message: "Quiz expired", 
      //     expired: true,
      //     detail: "This quiz has expired. Quizzes are available for 7 days after creation."
      //   });
      // }
      
      console.log(`🔍 Sending response for quiz ${quizId}:`, quiz);
      res.json(quiz);
      console.log(`🔍 Response sent successfully for quiz ${quizId}`);
    } catch (error) {
      console.error(`🔍 Error in GET /api/quizzes/${req.params.quizId}:`, error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  // Question routes
  app.post("/api/questions", async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(questionData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid question data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to create question" });
      }
    }
  });

  app.get("/api/quizzes/:quizId/questions", async (req, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      
      if (isNaN(quizId)) {
        return res.status(400).json({ message: "Invalid quiz ID" });
      }
      
      const questions = await storage.getQuestionsByQuizId(quizId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Quiz attempt routes
  app.post("/api/quiz-attempts", async (req, res) => {
    try {
      const attemptData = insertQuizAttemptSchema.parse(req.body);
      const attempt = await storage.createQuizAttempt(attemptData);
      res.status(201).json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid attempt data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to create quiz attempt" });
      }
    }
  });

  app.get("/api/quizzes/:quizId/attempts", async (req, res) => {
    try {
      // Add aggressive anti-caching headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const quizId = parseInt(req.params.quizId);
      const timestamp = Date.now(); // For debugging
      
      console.log(`[${timestamp}] Fetching attempts for quiz ${quizId}`);
      
      if (isNaN(quizId)) {
        return res.status(400).json({ message: "Invalid quiz ID" });
      }
      
      // Add a small delay to ensure previous writes have been committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const attempts = await storage.getQuizAttempts(quizId);
      
      console.log(`[${timestamp}] Returning ${attempts.length} attempts for quiz ${quizId}`);
      
      // Add a server timestamp in the response to help client detect freshness
      // Sort attempts by completion date (newest first) for immediate display
      attempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      console.log(`[${timestamp}] Sending sorted attempts: ${attempts.map(a => a.id).join(', ')}`);
      
      res.json({
        data: attempts,
        serverTime: timestamp,
        count: attempts.length
      });
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });
  
  // Get specific quiz attempt by ID
  app.get("/api/quiz-attempts/:attemptId", async (req, res) => {
    try {
      // Add anti-caching headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const attemptId = parseInt(req.params.attemptId);
      const timestamp = Date.now(); // For tracing and debugging
      
      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "Invalid attempt ID" });
      }
      
      console.log(`[${timestamp}] Fetching attempt with ID ${attemptId}`);
      
      // Get all attempt IDs from all quizzes
      // This is a temporary workaround since we don't have a direct getAttemptById method
      const allQuizzesList = await db.select().from(quizzes);
      const allAttempts = [];
      
      // Gather all attempts for all quizzes
      for (const quiz of allQuizzesList) {
        const quizAttempts = await storage.getQuizAttempts(quiz.id);
        allAttempts.push(...quizAttempts);
      }
      
      // Find the specific attempt
      const attempt = allAttempts.find(a => a.id === attemptId);
      
      if (!attempt) {
        console.log(`[${timestamp}] Attempt ID ${attemptId} not found`);
        return res.status(404).json({ message: "Quiz attempt not found" });
      }
      
      console.log(`[${timestamp}] Found attempt ${attemptId} (quiz ${attempt.quizId})`);
      
      // Send with timestamp for caching verification
      res.json({
        data: attempt,
        serverTime: timestamp
      });
    } catch (error) {
      console.error(`Error fetching quiz attempt ${req.params.attemptId}:`, error);
      res.status(500).json({ message: "Failed to fetch quiz attempt" });
    }
  });

  // Verify an answer
  app.post("/api/questions/:questionId/verify", async (req, res) => {
    try {
      const questionId = parseInt(req.params.questionId);
      
      if (isNaN(questionId)) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      const answerData = z.object({
        answer: z.union([z.string(), z.array(z.string())])
      }).parse(req.body);
      
      // Get all questions from the database
      const allQuestions = await db.select().from(questions);
      
      // Find the specific question
      const question = allQuestions.find((q: any) => q.id === questionId);
      
      if (!question) {
        console.error(`[SERVER ERROR] Question not found: ${questionId}`);
        return res.status(404).json({ message: "Question not found" });
      }
      
      let isCorrect = false;
      const correctAnswers = question.correctAnswers as string[];
      const userAnswer = answerData.answer;
      
      // Debug logs to trace the issue
      console.log(`Verifying answer for question ${questionId}:`);
      console.log(`- Correct answers:`, correctAnswers);
      console.log(`- User answer:`, userAnswer);
      
      if (Array.isArray(userAnswer)) {
        // For multiple answers, check if all are correct
        isCorrect = userAnswer.every(ans => 
          correctAnswers.some(correct => 
            correct.toLowerCase().trim() === ans.toLowerCase().trim()
          )
        );
      } else {
        // For single answer, check if it matches any correct answer
        // Use trim() to fix whitespace issues and ensure exact matching
        const normalizedUserAnswer = userAnswer.toString().toLowerCase().trim();
        isCorrect = correctAnswers.some(correct => 
          correct.toLowerCase().trim() === normalizedUserAnswer
        );
      }
      
      console.log(`Answer is ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
      
      // Return both the correctness and the expected answers for debugging
      res.json({ 
        isCorrect,
        debug: {
          questionText: question.text,
          correctAnswers: correctAnswers,
          userAnswer: userAnswer
        }
      });
    } catch (error) {
      console.error("Error verifying answer:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid answer data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to verify answer" });
      }
    }
  });
  
  // Image upload endpoint using Cloudinary
  app.post("/api/upload-image", upload.single('image'), async (req, res) => {
    try {
      // Import here to avoid circular dependencies
      const { uploadToCloudinary } = await import('./cloudinary');
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const filePath = req.file.path;
      const originalFilename = req.file.filename;
      
      console.log(`Processing image upload: ${originalFilename}`);
      
      // Get the quiz ID from the request body or query params
      // Default to 0 for new quizzes that don't have an ID yet
      const quizId = parseInt(req.body.quizId || req.query.quizId || '0');
      
      // Upload to Cloudinary with optimization
      const cloudinaryResult = await uploadToCloudinary(filePath, quizId);
      
      // Delete the temporary file after upload
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted temporary file: ${filePath}`);
      } catch (deleteErr) {
        console.error(`Warning: Could not delete temporary file:`, deleteErr);
        // Continue anyway as the upload is already complete
      }
      
      // Return the Cloudinary image URL
      res.status(201).json({ 
        imageUrl: cloudinaryResult.secure_url,
        // Include cache-busted URL for immediate use
        cacheBustedUrl: `${cloudinaryResult.secure_url}?t=${Date.now()}`,
        publicId: cloudinaryResult.public_id,
        message: "Image uploaded successfully to Cloudinary",
        format: cloudinaryResult.format,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        bytes: cloudinaryResult.bytes
      });
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      res.status(500).json({ 
        message: "Failed to upload image", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Add a backward compatibility route for any old image URLs
  // This will redirect to a "no image" placeholder to avoid breaking existing content
  app.use('/uploads', (req, res) => {
    console.log(`Legacy image request received for: ${req.path}`);
    // Return 404 with a JSON message explaining the change
    res.status(404).json({
      error: 'Legacy image path',
      message: 'Images are now served from Cloudinary for better performance and reliability'
    });
  });
  
  // Register contact form routes
  registerContactRoutes(app);
  
  // Register auto-create quiz routes (re-enabled after successful deployment)
  registerAutoCreateRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
