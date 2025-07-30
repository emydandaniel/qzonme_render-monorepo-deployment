// PDF Service with graceful fallback for Node.js compatibility
import fs from 'fs/promises';
import path from 'path';

export interface PDFProcessingResult {
  success: boolean;
  text: string;
  pageCount: number;
  processingTime: number;
  error?: string;
}

/**
 * Extract text from PDF file with graceful fallback
 * This provides a robust solution that won't break server startup
 */
export async function extractTextFromPDF(filePath: string, maxPages: number = 10): Promise<PDFProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log('📄 Starting PDF text extraction for:', filePath);
    
    // For now, provide a graceful fallback until we resolve PDF library issues
    // In a production environment, you might want to use external services
    // like Google Document AI, AWS Textract, or Adobe PDF Services API
    
    const processingTime = Date.now() - startTime;
    
    console.log('⚠️ PDF text extraction temporarily disabled due to library compatibility issues');
    console.log('� Consider using external PDF processing services for production');
    
    return {
      success: false,
      text: '',
      pageCount: 0,
      processingTime,
      error: 'PDF processing temporarily unavailable. Please use text or image files for auto-create feature.'
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ PDF text extraction failed:', error);
    
    return {
      success: false,
      text: '',
      pageCount: 0,
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown error during PDF processing'
    };
  }
}

/**
 * Check if a file is a PDF based on its extension
 */
export function isPDFFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.pdf';
}

/**
 * Validate PDF file before processing
 */
export async function validatePDFFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if file exists
    const stats = await fs.stat(filePath);
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `PDF file too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: 10MB)`
      };
    }
    
    // Basic PDF validation by checking file extension and magic bytes
    if (!isPDFFile(filePath)) {
      return {
        valid: false,
        error: 'File is not a PDF'
      };
    }
    
    // Check PDF magic bytes
    try {
      const buffer = await fs.readFile(filePath);
      const header = buffer.toString('ascii', 0, 4);
      
      if (!header.startsWith('%PDF')) {
        return {
          valid: false,
          error: 'Invalid PDF file format'
        };
      }
      
      return { 
        valid: true,
        error: 'PDF processing temporarily unavailable. Please use text or image files.'
      };
    } catch (readError) {
      return {
        valid: false,
        error: 'Cannot read PDF file'
      };
    }
    
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Cannot access PDF file'
    };
  }
}
