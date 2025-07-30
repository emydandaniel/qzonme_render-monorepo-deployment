// Professional PDF Service using PDF.js (pdfjs-dist) for reliable text extraction
import fs from "fs/promises";
import path from "path";
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker for Node.js
const PDFJS_WORKER_PATH = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs');

export interface PDFProcessingResult {
  success: boolean;
  text: string;
  pageCount: number;
  processingTime: number;
  error?: string;
}

export async function extractTextFromPDF(filePath: string, maxPages: number = 10): Promise<PDFProcessingResult> {
  const startTime = Date.now();
  try {
    console.log("📄 Starting professional PDF text extraction for:", filePath);
    
    // Check if file exists
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      throw new Error(`PDF file not found: ${filePath}`);
    }

    // Read PDF file
    const pdfBuffer: Buffer = await fs.readFile(filePath);
    console.log(`📊 PDF file size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Load PDF document using PDF.js
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
      disableFontFace: false,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const pagesToProcess = Math.min(pageCount, maxPages);

    console.log(`📚 PDF has ${pageCount} pages, processing first ${pagesToProcess} pages`);

    let extractedText = "";
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      try {
        console.log(`📄 Processing page ${pageNum}/${pagesToProcess}...`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let pageText = "";
        
        // Extract text items from the page
        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            pageText += item.str + " ";
          }
        }
        
        // Clean and filter the page text
        const cleanedPageText = cleanExtractedText(pageText);
        if (cleanedPageText.length > 20) {
          textParts.push(cleanedPageText);
        }
        
        console.log(`✅ Page ${pageNum}: extracted ${cleanedPageText.length} characters`);
      } catch (pageError) {
        console.warn(`⚠️ Failed to extract text from page ${pageNum}:`, pageError);
      }
    }

    // Combine all extracted text
    extractedText = textParts.join('\n\n').trim();
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ PDF processed successfully: ${pageCount} pages in ${processingTime}ms`);
    console.log(`� Total extracted text length: ${extractedText.length} characters`);

    if (extractedText.length > 100) {
      const sample = extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : '');
      console.log(`📝 Content sample: "${sample}"`);
    }

    return {
      success: true,
      text: extractedText.length > 0 ? extractedText : `This PDF contains ${pageCount} pages but text extraction was not successful. The PDF might be image-based or have complex formatting.`,
      pageCount,
      processingTime,
      error: undefined
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ PDF text extraction failed:", error);
    return {
      success: false,
      text: "",
      pageCount: 0,
      processingTime,
      error: error instanceof Error ? error.message : "Unknown error during PDF processing"
    };
  }
}

function cleanExtractedText(text: string): string {
  if (!text) return "";
  
  // Remove PDF technical artifacts
  let cleaned = text
    // Remove PDF object references
    .replace(/\b\d+\s+\d+\s+obj\b/g, '')
    .replace(/\b\d+\s+\d+\s+R\b/g, '')
    .replace(/\bendobj\b/g, '')
    .replace(/\bstream\b/g, '')
    .replace(/\bendstream\b/g, '')
    // Remove PDF commands
    .replace(/\/[A-Z][A-Za-z]*/g, '')
    .replace(/\[[^\]]*\]/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove non-printable characters except newlines
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();

  // Filter out technical PDF terms
  const technicalTerms = [
    'mediabox', 'annotation', 'cross-reference', 'hyperlink', 
    'pdf structure', 'font encoding', '/type', '/subtype',
    'obj', 'endobj', 'filter', 'length', 'xref'
  ];
  
  const words = cleaned.split(/\s+/);
  const filteredWords = words.filter(word => {
    const lowerWord = word.toLowerCase();
    return !technicalTerms.some(term => lowerWord.includes(term)) &&
           word.length > 2 &&
           /[a-zA-Z]/.test(word);
  });
  
  return filteredWords.join(' ').trim();
}

// Additional helper functions for PDF validation
export function isPDFFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.pdf';
}

export function validatePDFFile(filePath: string): { valid: boolean; error?: string } {
  if (!isPDFFile(filePath)) {
    return { valid: false, error: 'File is not a PDF' };
  }
  return { valid: true };
}
