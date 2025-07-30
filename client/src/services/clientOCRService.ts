/**
 * Client-side OCR service using Tesseract.js
 * This runs in the browser for real-time image processing
 * Following guide: https://github.com/naptha/tesseract.js
 */

import Tesseract, { createWorker } from 'tesseract.js';

// Note: PDF.js removed due to server-side compatibility issues
// PDF processing is now handled by server-side services only

export interface ClientOCRResult {
  success: boolean;
  text: string;
  confidence: number; // 0-1 scale
  quality: number; // 1-10 scale
  metadata: {
    method: 'tesseract-image' | 'tesseract-pdf' | 'tesseract-multi';
    processingTime: number;
    wordCount: number;
    pageCount?: number;
    imageInfo: {
      width?: number;
      height?: number;
      size?: number;
    };
    error?: string;
  };
}

export interface OCRProgressCallback {
  (progress: number, status: string): void;
}

/**
 * Extract text from image file using client-side Tesseract.js
 */
export async function extractTextFromImageClient(
  imageFile: File,
  onProgress?: OCRProgressCallback
): Promise<ClientOCRResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting client-side OCR for:', imageFile.name);
    
    // Validate image file
    const validation = validateImageFileForOCR(imageFile);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image file');
    }
    
    // Report initial progress
    onProgress?.(0, 'Initializing OCR worker...');
    
    // Create Tesseract worker
    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && m.progress) {
          const progress = Math.round(m.progress * 100);
          onProgress?.(progress, `Processing image... ${progress}%`);
          console.log(`OCR Progress: ${progress}%`);
        } else if (m.status) {
          onProgress?.(0, m.status);
          console.log(`OCR Status: ${m.status}`);
        }
      }
    });
    
    try {
      onProgress?.(10, 'Analyzing image...');
      
      // Create URL for the image file
      const imageUrl = URL.createObjectURL(imageFile);
      
      try {
        // Perform OCR
        const result = await worker.recognize(imageUrl);
        
        // Extract text and confidence
        const extractedText = result.data.text || '';
        const confidence = (result.data.confidence || 0) / 100; // Convert to 0-1 scale
        
        console.log(`✅ Client OCR completed: ${extractedText.length} characters, ${confidence.toFixed(2)} confidence`);
        
        // Assess text quality
        const quality = assessClientOCRTextQuality(extractedText, confidence);
        
        onProgress?.(100, 'OCR complete!');
        
        return {
          success: extractedText.trim().length > 0,
          text: extractedText.trim(),
          confidence,
          quality,
          metadata: {
            method: 'tesseract-image',
            processingTime: Date.now() - startTime,
            wordCount: extractedText.split(/\s+/).filter((w: string) => w.length > 0).length,
            imageInfo: {
              width: 0, // Would need image element to get dimensions
              height: 0,
              size: imageFile.size
            }
          }
        };
        
      } finally {
        // Clean up the object URL
        URL.revokeObjectURL(imageUrl);
      }
      
    } finally {
      // Always terminate the worker
      await worker.terminate();
    }
    
  } catch (error) {
    console.error('Client OCR error:', error);
    onProgress?.(0, 'OCR failed');
    
    return {
      success: false,
      text: '',
      confidence: 0,
      quality: 0,
      metadata: {
        method: 'tesseract-image',
        processingTime: Date.now() - startTime,
        wordCount: 0,
        imageInfo: {
          size: imageFile.size
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Extract text from PDF by converting pages to images and running OCR
 * NOTE: Client-side PDF processing has been disabled due to server compatibility issues.
 * PDF processing is now handled exclusively by server-side services.
 * @param pdfFile - PDF File object (not processed client-side)
 * @param language - Language code for OCR (default: 'eng')
 * @param onProgress - Progress callback function
 * @param maxPages - Maximum number of pages to process (default: 10)
 */
export async function extractTextFromPDFClient(
  pdfFile: File,
  language: string = 'eng',
  onProgress?: (progress: number, status: string) => void,
  maxPages: number = 10
): Promise<ClientOCRResult> {
  const startTime = Date.now();
  
  // PDF processing is no longer available client-side
  console.warn('⚠️ Client-side PDF processing is disabled. Please use server-side PDF processing.');
  
  onProgress?.(0, 'Client-side PDF processing not available');
  
  return {
    success: false,
    text: '',
    confidence: 0,
    quality: 0,
    metadata: {
      method: 'tesseract-pdf',
      processingTime: Date.now() - startTime,
      wordCount: 0,
      pageCount: 0,
      imageInfo: {
        size: pdfFile.size
      },
      error: 'Client-side PDF processing is disabled for server compatibility. Please use server-side PDF processing instead.'
    }
  };
}

/**
 * Extract text from multiple files (images and PDFs)
 */
export async function extractTextFromMultipleFilesClient(
  files: File[],
  language: string = 'eng',
  onProgress?: (fileIndex: number, fileProgress: number, fileName: string) => void
): Promise<{
  success: boolean;
  combinedText: string;
  results: ClientOCRResult[];
  overallQuality: number;
  totalProcessingTime: number;
}> {
  const startTime = Date.now();
  const results: ClientOCRResult[] = [];
  const textParts: string[] = [];
  let totalQuality = 0;
  let successCount = 0;
  
  try {
    // Process files sequentially to avoid overwhelming the browser
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      console.log(`📂 Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      let result: ClientOCRResult;
      
      if (file.type === 'application/pdf') {
        // Process PDF
        result = await extractTextFromPDFClient(file, language, (progress, status) => {
          onProgress?.(i, progress, file.name);
        });
      } else if (file.type.startsWith('image/')) {
        // Process image
        result = await extractTextFromImageClient(file, (progress, status) => {
          onProgress?.(i, progress, file.name);
        });
      } else {
        // Unsupported file type
        result = {
          success: false,
          text: '',
          confidence: 0,
          quality: 0,
          metadata: {
            method: 'tesseract-multi',
            processingTime: 0,
            wordCount: 0,
            imageInfo: {
              size: file.size
            },
            error: `Unsupported file type: ${file.type}`
          }
        };
      }
      
      results.push(result);
      
      if (result.success && result.text.trim()) {
        textParts.push(`\n=== ${file.name} ===\n${result.text.trim()}`);
        totalQuality += result.quality;
        successCount++;
      }
    }
    
    const combinedText = textParts.join('\n\n');
    const overallQuality = successCount > 0 ? totalQuality / successCount : 0;
    
    console.log(`🎉 Multi-file OCR completed: ${combinedText.length} characters from ${successCount}/${files.length} files`);
    
    return {
      success: successCount > 0,
      combinedText,
      results,
      overallQuality,
      totalProcessingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Multi-file OCR error:', error);
    
    return {
      success: false,
      combinedText: '',
      results,
      overallQuality: 0,
      totalProcessingTime: Date.now() - startTime
    };
  }
}

/**
 * Preprocess image for better OCR results (client-side)
 */
export async function preprocessImageForOCRClient(
  imageFile: File,
  options: {
    enhance?: boolean;
    resize?: boolean;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<File> {
  try {
    // Create canvas for image processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    // Load image
    const img = new Image();
    const imageUrl = URL.createObjectURL(imageFile);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          let { width, height } = img;
          
          // Resize if needed
          if (options.resize && (options.maxWidth || options.maxHeight)) {
            const maxWidth = options.maxWidth || 1920;
            const maxHeight = options.maxHeight || 1080;
            
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
          }
          
          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Apply enhancements if requested
          if (options.enhance) {
            // Convert to grayscale and enhance contrast
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              // Convert to grayscale
              const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
              
              // Enhance contrast (simple threshold)
              const enhanced = gray > 128 ? 255 : 0;
              
              data[i] = enhanced;     // R
              data[i + 1] = enhanced; // G
              data[i + 2] = enhanced; // B
              // Alpha channel (data[i + 3]) remains unchanged
            }
            
            ctx.putImageData(imageData, 0, 0);
          }
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              const processedFile = new File([blob], imageFile.name, {
                type: 'image/png',
                lastModified: Date.now()
              });
              resolve(processedFile);
            } else {
              reject(new Error('Failed to process image'));
            }
          }, 'image/png');
          
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
    
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return imageFile; // Return original file if preprocessing fails
  }
}

/**
 * Validate image file for client-side OCR
 */
function validateImageFileForOCR(file: File): { valid: boolean; error?: string } {
  // Check file type
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported image format. Please use JPEG, PNG, GIF, or BMP.' };
  }
  
  // Check file size (max 10MB for client processing)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image file too large. Maximum size is 10MB.' };
  }
  
  if (file.size < 1024) { // Less than 1KB
    return { valid: false, error: 'Image file too small.' };
  }
  
  return { valid: true };
}

/**
 * Validate PDF file for client-side OCR
 */
export function validatePDFFileForOCR(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF document.' };
  }
  
  // Check file size (max 20MB for PDF processing)
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return { valid: false, error: 'PDF file too large. Maximum size is 20MB.' };
  }
  
  if (file.size < 1024) { // Less than 1KB
    return { valid: false, error: 'PDF file too small.' };
  }
  
  return { valid: true };
}

/**
 * Validate any file for client-side OCR (images and PDFs)
 */
export function validateFileForOCR(file: File): { valid: boolean; error?: string } {
  if (file.type === 'application/pdf') {
    return validatePDFFileForOCR(file);
  } else if (file.type.startsWith('image/')) {
    return validateImageFileForOCR(file);
  } else {
    return { valid: false, error: 'Unsupported file type. Please use images (JPEG, PNG, GIF, BMP) or PDF files.' };
  }
}

/**
 * Get supported languages for OCR with language codes
 */
export function getSupportedOCRLanguages(): Array<{ code: string; name: string }> {
  return [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'nld', name: 'Dutch' },
    { code: 'rus', name: 'Russian' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'kor', name: 'Korean' },
    { code: 'ara', name: 'Arabic' },
    { code: 'hin', name: 'Hindi' }
  ];
}

/**
 * Preload Tesseract.js worker for faster processing
 */
export async function preloadTesseractWorker(language: string = 'eng'): Promise<boolean> {
  try {
    console.log('🔄 Preloading Tesseract.js worker...');
    
    // Create and warm up a worker
    const worker = await createWorker(language);
    await worker.terminate();
    
    console.log('✅ Tesseract.js worker preloaded');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to preload Tesseract worker:', error);
    return false;
  }
}

/**
 * Assess quality of client OCR extracted text
 */
function assessClientOCRTextQuality(text: string, confidence: number): number {
  let quality = Math.round(confidence * 10); // Start with confidence-based score
  
  // Length assessment
  if (text.length < 50) quality -= 3;
  else if (text.length < 200) quality -= 1;
  
  // Word structure assessment
  const words = text.split(/\s+/).filter((w: string) => w.length > 0);
  const validWords = words.filter((word: string) => /^[a-zA-Z0-9.,!?;:'"()-]+$/.test(word));
  const validWordRatio = words.length > 0 ? validWords.length / words.length : 0;
  
  if (validWordRatio < 0.5) quality -= 3; // Lots of OCR artifacts
  else if (validWordRatio < 0.7) quality -= 2;
  else if (validWordRatio < 0.9) quality -= 1;
  
  // Sentence structure assessment
  const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 5);
  if (sentences.length === 0) quality -= 2;
  
  // Check for common OCR errors
  const ocrErrorPatterns = [
    /[|]{2,}/, // Multiple pipes (common OCR error)
    /[_]{3,}/, // Multiple underscores
    /\s[a-z]\s/g, // Single letters (often OCR artifacts)
    /[0-9]{10,}/ // Very long numbers (often OCR errors)
  ];
  
  ocrErrorPatterns.forEach((pattern: RegExp) => {
    if (pattern.test(text)) quality -= 1;
  });
  
  return Math.max(1, Math.min(10, quality));
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  });
}
