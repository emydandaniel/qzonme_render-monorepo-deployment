import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

// Configure PDF.js for Node.js environment
// Point to the actual worker file that exists
try {
  const require = createRequire(import.meta.url);
  const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
  // Convert Windows path to proper file:// URL
  GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  console.log('🔧 PDF worker configured at:', GlobalWorkerOptions.workerSrc);
} catch (error) {
  console.warn('⚠️ PDF worker setup failed:', error);
  // Fallback - disable worker entirely for Node.js
  GlobalWorkerOptions.workerSrc = false as any;
  console.log('🔧 PDF worker disabled, using synchronous processing');
}

export interface PDFProcessingResult {
  success: boolean;
  text: string;
  pageCount: number;
  processingTime: number;
  error?: string;
}

/**
 * Extract text from PDF file using PDF.js text extraction (not OCR)
 * This extracts selectable text directly from the PDF
 */
export async function extractTextFromPDF(filePath: string, maxPages: number = 10): Promise<PDFProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log('📄 Starting PDF text extraction for:', filePath);
    
    // Read PDF file
    const pdfBuffer = await fs.readFile(filePath);
    // Convert Buffer to Uint8Array for PDF.js compatibility
    const pdfData = new Uint8Array(pdfBuffer);
    const loadingTask = getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    const totalPages = Math.min(pdf.numPages, maxPages);
    console.log(`📄 PDF loaded: ${totalPages} pages to process (${pdf.numPages} total)`);
    
    const extractedTexts: string[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items into a single string
        const pageText = textContent.items
          .map((item: any) => {
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ')
          .trim();
        
        if (pageText) {
          extractedTexts.push(pageText);
          console.log(`📄 Page ${pageNum}: extracted ${pageText.length} characters`);
        }
      } catch (pageError) {
        console.warn(`⚠️ Error processing page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    const combinedText = extractedTexts.join('\n\n').trim();
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ PDF text extraction completed in ${processingTime}ms`);
    console.log(`📊 Extracted ${combinedText.length} characters from ${extractedTexts.length} pages`);
    
    return {
      success: true,
      text: combinedText,
      pageCount: extractedTexts.length,
      processingTime
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
    
    // Check if it's actually a PDF by trying to load it
    const pdfBuffer = await fs.readFile(filePath);
    // Convert Buffer to Uint8Array for PDF.js compatibility
    const pdfData = new Uint8Array(pdfBuffer);
    const loadingTask = getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    if (pdf.numPages === 0) {
      return {
        valid: false,
        error: 'PDF file has no pages'
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid PDF file'
    };
  }
}
