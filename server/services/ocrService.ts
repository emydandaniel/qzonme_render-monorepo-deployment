import fs from 'fs';
import path from 'path';
import { AUTO_CREATE_SERVER_CONFIG } from '../config/autoCreate';

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number; // 0-1 scale
  quality: number; // 1-10 scale
  metadata: {
    method: 'tesseract';
    processingTime: number;
    wordCount: number;
    error?: string;
    imageInfo?: {
      width?: number;
      height?: number;
      format?: string;
    };
  };
}

/**
 * OCR service using Tesseract.js for reliable text extraction
 */
export async function extractTextWithTesseract(imagePath: string): Promise<OCRResult> {
  const startTime = Date.now();
  
  try {
    // Import Tesseract.js dynamically
    const { createWorker } = await import('tesseract.js');
    
    console.log('🔍 Running Tesseract OCR on:', imagePath);
    
    // Validate image first
    const validation = validateImageForOCR(imagePath);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image file');
    }
    
    // Initialize Tesseract worker
    const worker = await createWorker('eng');
    
    try {
      // Perform OCR with basic configuration
      const result = await worker.recognize(imagePath);
      
      // Extract text and confidence
      const extractedText = result.data.text || '';
      const confidence = (result.data.confidence || 0) / 100; // Convert to 0-1 scale
      
      console.log(`✅ Tesseract completed: ${extractedText.length} characters, ${confidence.toFixed(2)} confidence`);
      
      // Assess text quality
      const quality = assessOCRTextQuality(extractedText, confidence);
      
      // Get image info
      const imageInfo = getImageInfo(imagePath);
      
      return {
        success: extractedText.trim().length > 0,
        text: extractedText.trim(),
        confidence,
        quality,
        metadata: {
          method: 'tesseract',
          processingTime: Date.now() - startTime,
          wordCount: extractedText.split(/\s+/).filter((w: string) => w.length > 0).length,
          imageInfo
        }
      };
      
    } finally {
      // Always terminate the worker to free up resources
      await worker.terminate();
    }
    
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    
    return {
      success: false,
      text: '',
      confidence: 0,
      quality: 0,
      metadata: {
        method: 'tesseract',
        processingTime: Date.now() - startTime,
        wordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Enhanced OCR using Tesseract.js with improved configuration
 */
export async function extractTextFallback(imagePath: string): Promise<OCRResult> {
  console.log('🔄 Using Tesseract.js OCR...');
  return extractTextWithTesseract(imagePath);
}

/**
 * Main OCR function using Tesseract.js for reliable text extraction
 */
export async function extractTextFromImage(imagePath: string): Promise<OCRResult> {
  try {
    console.log('🔍 Starting OCR processing with Tesseract...');
    
    // Use Tesseract for OCR processing
    const tesseractResult = await extractTextWithTesseract(imagePath);
    
    if (tesseractResult.success && tesseractResult.quality >= AUTO_CREATE_SERVER_CONFIG.OCR_QUALITY_THRESHOLD * 10) {
      console.log('✅ Tesseract OCR successful with good quality');
      return tesseractResult;
    }
    
    if (tesseractResult.success) {
      console.log('⚠️ Tesseract OCR successful but with lower quality');
      return tesseractResult;
    }
    
    console.log('❌ Tesseract OCR failed');
    return tesseractResult;
    
  } catch (error) {
    console.error('OCR extraction error:', error);
    
    return {
      success: false,
      text: '',
      confidence: 0,
      quality: 0,
      metadata: {
        method: 'tesseract',
        processingTime: 0,
        wordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Process multiple images and combine results
 */
export async function extractTextFromMultipleImages(imagePaths: string[]): Promise<{
  success: boolean;
  combinedText: string;
  results: OCRResult[];
  overallQuality: number;
  totalProcessingTime: number;
}> {
  const startTime = Date.now();
  const results: OCRResult[] = [];
  const textParts: string[] = [];
  let totalQuality = 0;
  let successCount = 0;
  
  try {
    // Process images in parallel for better performance
    const promises = imagePaths.map(imagePath => extractTextFromImage(imagePath));
    const ocrResults = await Promise.all(promises);
    
    ocrResults.forEach((result, index) => {
      results.push(result);
      
      if (result.success && result.text.trim()) {
        textParts.push(result.text.trim());
        totalQuality += result.quality;
        successCount++;
      }
    });
    
    const combinedText = textParts.join('\n\n');
    const overallQuality = successCount > 0 ? totalQuality / successCount : 0;
    
    return {
      success: successCount > 0,
      combinedText,
      results,
      overallQuality,
      totalProcessingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Multiple image OCR error:', error);
    
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
 * Assess quality of OCR extracted text
 */
function assessOCRTextQuality(text: string, confidence: number): number {
  let quality = Math.round(confidence * 10); // Start with confidence-based score
  
  // Length assessment
  if (text.length < 50) quality -= 3;
  else if (text.length < 200) quality -= 1;
  
  // Word structure assessment
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const validWords = words.filter(word => /^[a-zA-Z0-9.,!?;:'"()-]+$/.test(word));
  const validWordRatio = validWords.length / words.length;
  
  if (validWordRatio < 0.5) quality -= 3; // Lots of OCR artifacts
  else if (validWordRatio < 0.7) quality -= 2;
  else if (validWordRatio < 0.9) quality -= 1;
  
  // Sentence structure assessment
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) quality -= 2;
  
  // Check for common OCR errors
  const ocrErrorPatterns = [
    /[|]{2,}/, // Multiple pipes (common OCR error)
    /[_]{3,}/, // Multiple underscores
    /\s[a-z]\s/g, // Single letters (often OCR artifacts)
    /[0-9]{10,}/ // Very long numbers (often OCR errors)
  ];
  
  ocrErrorPatterns.forEach(pattern => {
    if (pattern.test(text)) quality -= 1;
  });
  
  return Math.max(1, Math.min(10, quality));
}

/**
 * Get basic image information
 */
function getImageInfo(imagePath: string): { width?: number; height?: number; format?: string } {
  try {
    const stats = fs.statSync(imagePath);
    const extension = path.extname(imagePath).toLowerCase();
    
    return {
      format: extension.replace('.', ''),
      // Note: For full image info, you'd need an image processing library like sharp
      // This is a basic implementation
    };
  } catch (error) {
    console.warn('Failed to get image info:', error);
    return {};
  }
}

/**
 * Preprocess image for better OCR results
 */
export async function preprocessImageForOCR(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    // This is a placeholder for image preprocessing
    // In a real implementation, you might use sharp or similar library to:
    // - Resize image to optimal size
    // - Adjust contrast and brightness
    // - Convert to grayscale
    // - Remove noise
    // - Deskew the image
    
    // For now, just copy the file
    fs.copyFileSync(inputPath, outputPath);
    return true;
    
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return false;
  }
}

/**
 * Validate image file for OCR processing
 */
export function validateImageForOCR(imagePath: string): { valid: boolean; error?: string } {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return { valid: false, error: 'Image file does not exist' };
    }
    
    // Check file size
    const stats = fs.statSync(imagePath);
    if (stats.size > AUTO_CREATE_SERVER_CONFIG.MAX_FILE_SIZE) {
      return { valid: false, error: 'Image file too large' };
    }
    
    if (stats.size < 1024) { // Less than 1KB
      return { valid: false, error: 'Image file too small' };
    }
    
    // Check file extension - Tesseract supports many formats
    const extension = path.extname(imagePath).toLowerCase();
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
    
    if (!supportedFormats.includes(extension)) {
      return { valid: false, error: `Unsupported image format: ${extension}. Supported formats: ${supportedFormats.join(', ')}` };
    }
    
    // Additional validation - check if file looks like an image by reading first few bytes
    try {
      const buffer = fs.readFileSync(imagePath, { start: 0, end: 10 });
      const header = buffer.toString('hex');
      
      // Check for common image file signatures
      const isValidImage = (
        header.startsWith('ffd8ff') || // JPEG
        header.startsWith('89504e47') || // PNG
        header.startsWith('47494638') || // GIF
        header.startsWith('424d') || // BMP
        header.startsWith('49492a00') || // TIFF (little-endian)
        header.startsWith('4d4d002a') || // TIFF (big-endian)
        header.startsWith('52494646') // WEBP (starts with RIFF)
      );
      
      if (!isValidImage) {
        return { valid: false, error: 'File does not appear to be a valid image' };
      }
    } catch (readError) {
      return { valid: false, error: 'Unable to read image file' };
    }
    
    return { valid: true };
    
  } catch (error) {
    return { valid: false, error: 'Failed to validate image file' };
  }
}