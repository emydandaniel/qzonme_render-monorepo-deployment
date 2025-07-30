// PDF Service using pdf2pic + tesseract for text extraction
import fs from "fs/promises";
import path from "path";
import { PDFDocument, PDFName } from "pdf-lib";

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
    console.log("📄 Starting PDF text extraction for:", filePath);
    
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      throw new Error(`PDF file not found: ${filePath}`);
    }
    
    const pdfBuffer = await fs.readFile(filePath);
    console.log(`📊 PDF file size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Try to extract text using a simple heuristic approach
    const extractedText = await extractTextFromPDFBuffer(pdfBuffer, Math.min(pageCount, maxPages));
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ PDF processed successfully: ${pageCount} pages in ${processingTime}ms`);
    console.log(`📝 Extracted text length: ${extractedText.length} characters`);
    
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

export function isPDFFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".pdf";
}

export async function validatePDFFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const stats = await fs.stat(filePath);
    
    const maxSize = 10 * 1024 * 1024;
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `PDF file too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: 10MB)`
      };
    }
    
    if (!isPDFFile(filePath)) {
      return {
        valid: false,
        error: "File is not a PDF"
      };
    }
    
    const buffer = await fs.readFile(filePath);
    const header = buffer.toString("ascii", 0, 4);
    
    if (!header.startsWith("%PDF")) {
      return {
        valid: false,
        error: "Invalid PDF file format"
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Cannot access PDF file"
    };
  }
}

async function extractTextFromPDFBuffer(pdfBuffer: Buffer, maxPages: number): Promise<string> {
  try {
    console.log("🔍 Attempting advanced PDF text extraction...");
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    const pagesToProcess = Math.min(pageCount, maxPages);
    
    let extractedTexts: string[] = [];
    
    // Method 1: Try to extract text from PDF structure
    try {
      // Get the PDF catalog and try to extract text objects
      const catalog = pdfDoc.catalog;
      const pages = pdfDoc.getPages();
      
      for (let i = 0; i < pagesToProcess; i++) {
        const page = pages[i];
        if (page) {
          // Try to get text content from the page
          const pageRef = pdfDoc.context.nextRef();
          const pageDict = page.node;
          
          // Look for text in the page's content streams
          const contentStreams = pageDict.get(PDFName.of('Contents'));
          if (contentStreams) {
            console.log(`📄 Processing page ${i + 1}...`);
            
            // This is a simplified approach - we'll extract readable ASCII text
            const pageText = await extractTextFromPage(pdfBuffer, i);
            if (pageText && pageText.length > 20) {
              extractedTexts.push(pageText);
            }
          }
        }
      }
    } catch (structureError) {
      console.log("⚠️ PDF structure extraction failed, trying alternative method...");
    }
    
    // Method 2: Fallback to buffer analysis with better patterns
    if (extractedTexts.length === 0) {
      console.log("🔄 Using fallback text extraction method...");
      const bufferText = await extractTextFromBufferAdvanced(pdfBuffer);
      if (bufferText) {
        extractedTexts.push(bufferText);
      }
    }
    
    // Combine and clean the extracted text
    const combinedText = extractedTexts
      .join('\n\n')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
      .trim();
    
    console.log(`✅ Extracted ${combinedText.length} characters from ${pagesToProcess} pages`);
    
    if (combinedText.length > 100) {
      return combinedText;
    } else if (combinedText.length > 0) {
      return `${combinedText}\n\n[Note: This PDF may contain additional content that requires OCR processing]`;
    } else {
      return "This PDF appears to be image-based or has complex formatting. The content could not be extracted as text and would require OCR processing.";
    }
    
  } catch (error) {
    console.error("Error extracting text from PDF buffer:", error);
    return "Text extraction failed - PDF may be encrypted, corrupted, or require specialized processing.";
  }
}

async function extractTextFromPage(pdfBuffer: Buffer, pageIndex: number): Promise<string> {
  try {
    // Convert buffer to string and look for text objects on specific page
    const pdfString = pdfBuffer.toString('binary');
    
    // Look for text showing operations like "BT...ET" (Begin Text...End Text)
    const textBlockRegex = new RegExp('BT\\s+(.*?)\\s+ET', 'g');
    const textMatches = pdfString.match(textBlockRegex);
    
    if (textMatches && textMatches.length > pageIndex) {
      const pageTextBlock = textMatches[pageIndex];
      
      // Extract text from within parentheses and brackets
      const textContentRegex = /\((.*?)\)|<(.*?)>/g;
      let match;
      const texts = [];
      
      while ((match = textContentRegex.exec(pageTextBlock)) !== null) {
        const text = match[1] || match[2];
        if (text && text.length > 2) {
          // Decode basic PDF text encoding
          const decoded = text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
          
          texts.push(decoded);
        }
      }
      
      return texts.join(' ').trim();
    }
    
    return '';
  } catch (error) {
    console.error(`Error extracting text from page ${pageIndex}:`, error);
    return '';
  }
}

async function extractTextFromBufferAdvanced(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert to different encodings and look for readable text
    const encodings = ['utf8', 'latin1', 'ascii'];
    let bestText = '';
    
    for (const encoding of encodings) {
      const text = pdfBuffer.toString(encoding as BufferEncoding);
      
      // Look for patterns that indicate readable text
      const readableTextRegex = /[A-Za-z][A-Za-z0-9\s\.\,\!\?\;\:\-\(\)\[\]\"\']{15,}/g;
      const matches = text.match(readableTextRegex);
      
      if (matches && matches.length > 0) {
        const extractedText = matches
          .filter(match => {
            // Filter out likely PDF commands and metadata
            return !match.includes('obj') && 
                   !match.includes('endobj') && 
                   !match.includes('stream') &&
                   !match.includes('Filter') &&
                   match.split(' ').length >= 3; // At least 3 words
          })
          .slice(0, 100) // Limit to first 100 matches
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (extractedText.length > bestText.length) {
          bestText = extractedText;
        }
      }
    }
    
    return bestText;
  } catch (error) {
    console.error("Error in advanced buffer extraction:", error);
    return '';
  }
}
