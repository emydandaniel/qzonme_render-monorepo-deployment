// Professional PDF Service using pdf-text-extract for reliable Node.js text extraction
import fs from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { promisify } from "util";

// Import pdf-text-extract with proper typing
const pdfTextExtract = require('pdf-text-extract');
const extractText = promisify(pdfTextExtract);

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
    console.log("📄 Starting reliable PDF text extraction for:", filePath);
    
    // Check if file exists
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      throw new Error(`PDF file not found: ${filePath}`);
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    console.log(`📊 PDF file size: ${(stats.size / 1024).toFixed(2)} KB`);

    // Get page count using pdf-lib
    let pageCount = 0;
    try {
      const pdfBuffer = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      pageCount = pdfDoc.getPageCount();
      console.log(`📚 PDF has ${pageCount} pages`);
    } catch (pageCountError) {
      console.warn("⚠️ Could not get page count, proceeding with extraction");
    }

    // Extract text using pdf-text-extract (Node.js optimized)
    const extractedTextArray: string[] = await extractText(filePath, {
      splitPages: false,
      preserveLineBreaks: false
    });

    // Process extracted text
    let rawText = "";
    if (Array.isArray(extractedTextArray)) {
      rawText = extractedTextArray.join(' ');
    } else if (typeof extractedTextArray === 'string') {
      rawText = extractedTextArray;
    }

    // Clean and filter the extracted text
    const cleanedText = cleanExtractedText(rawText);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ PDF processed successfully: ${pageCount} pages in ${processingTime}ms`);
    console.log(`📝 Total extracted text length: ${cleanedText.length} characters`);

    if (cleanedText.length > 100) {
      const sample = cleanedText.substring(0, 200) + (cleanedText.length > 200 ? '...' : '');
      console.log(`📝 Content sample: "${sample}"`);
    }

    return {
      success: true,
      text: cleanedText.length > 0 ? cleanedText : `This PDF contains ${pageCount} pages but text extraction was not successful. The PDF might be image-based or have complex formatting.`,
      pageCount,
      processingTime,
      error: undefined
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ PDF text extraction failed:", error);
    
    // Fallback to pdf-lib if primary extraction fails
    try {
      console.log("🔄 Attempting fallback extraction with pdf-lib...");
      const fallbackResult = await fallbackExtraction(filePath);
      if (fallbackResult.length > 0) {
        return {
          success: true,
          text: fallbackResult,
          pageCount: 0,
          processingTime: Date.now() - startTime,
          error: undefined
        };
      }
    } catch (fallbackError) {
      console.error("❌ Fallback extraction also failed:", fallbackError);
    }

    return {
      success: false,
      text: "",
      pageCount: 0,
      processingTime,
      error: error instanceof Error ? error.message : "Unknown error during PDF processing"
    };
  }
}

async function fallbackExtraction(filePath: string): Promise<string> {
  try {
    const pdfBuffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Try to extract text using basic buffer analysis
    const pdfString = pdfBuffer.toString('utf8');
    
    // Look for readable text patterns
    const textMatches = pdfString.match(/[A-Za-z][A-Za-z0-9\s\.,!?;:\-()\[\]"']{15,}/g);
    
    if (textMatches && textMatches.length > 0) {
      const extractedText = textMatches
        .filter(match => {
          // Filter out PDF technical terms
          const lowerMatch = match.toLowerCase();
          return !lowerMatch.includes('obj') &&
                 !lowerMatch.includes('endobj') &&
                 !lowerMatch.includes('stream') &&
                 !lowerMatch.includes('filter') &&
                 !lowerMatch.includes('length') &&
                 !lowerMatch.includes('xref') &&
                 match.split(' ').length >= 3;
        })
        .slice(0, 20)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return cleanExtractedText(extractedText);
    }
    
    return "";
  } catch (error) {
    console.error("Error in fallback extraction:", error);
    return "";
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
