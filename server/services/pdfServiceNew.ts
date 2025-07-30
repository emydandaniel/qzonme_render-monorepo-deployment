// PDF Service using pdf2pic + tesseract for text extraction
import fs from "fs/promises";
import path from "path";
import { PDFDocument, PDFName } from "pdf-lib";
import pdfParse from "pdf-parse";

export interface PDFProcessingResult {
  success: boolean;
  text: string;
  pageCount: number;
  processingTime: number;
  error?: string;

export async function extractTextFromPDF(filePath: string, maxPages: number = 10): Promise<PDFProcessingResult> {
  const startTime = Date.now();
  try {
    console.log("📄 Starting PDF text extraction for:", filePath);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      throw new Error(`PDF file not found: ${filePath}`);
    }
    const pdfBuffer: Buffer = await fs.readFile(filePath);
    console.log(`📊 PDF file size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // --- Use pdf-parse for robust text extraction ---
    let extractedText: string = "";
    let pageCount: number = 0;
    let usedPdfParse = false;
    try {
      const pdfParseResult: any = await pdfParse(pdfBuffer);
      extractedText = pdfParseResult.text || "";
      pageCount = pdfParseResult.numpages || 0;
      usedPdfParse = true;
      console.log(`✅ pdf-parse extracted ${extractedText.length} characters from ${pageCount} pages`);
    } catch (parseErr) {
      console.warn("⚠️ pdf-parse failed, falling back to custom extraction:", parseErr);
    }

    // Fallback to custom extraction if pdf-parse fails or returns little text
    if (!extractedText || extractedText.length < 100) {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      pageCount = pdfDoc.getPageCount();
      extractedText = await extractTextFromPDFBuffer(pdfBuffer, Math.min(pageCount, maxPages));
      console.log(`✅ Fallback extractor got ${extractedText.length} characters from ${pageCount} pages`);
    }

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
      const catalog = pdfDoc.catalog;
      const pages = pdfDoc.getPages();
      for (let i = 0; i < pagesToProcess; i++) {
        const page = pages[i];
        if (page) {
          const pageRef = pdfDoc.context.nextRef();
          const pageDict = page.node;
          const contentStreams = pageDict.get(PDFName.of('Contents'));
          if (contentStreams) {
            console.log(`📄 Processing page ${i + 1}...`);
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
    // Method 3: Try direct content extraction if still no good results
    if (extractedTexts.length === 0 || extractedTexts.join('').length < 500) {
      console.log("🔄 Trying direct content pattern extraction...");
      const directContent = await extractDirectContent(pdfBuffer);
      if (directContent && directContent.length > 200) {
        extractedTexts.push(directContent);
      }
    }
    // Combine and clean the extracted text
    const combinedText = extractedTexts
      .join('\n\n')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim();
    console.log(`✅ Extracted ${combinedText.length} characters from ${pagesToProcess} pages`);
    if (combinedText.length > 100) {
      const sample = combinedText.substring(0, 200) + (combinedText.length > 200 ? '...' : '');
      console.log(`📝 Content sample: "${sample}"`);
    }
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

async function extractTextFromBufferAdvanced(pdfBuffer: Buffer): Promise<string> {
  try {
    const encodings = ['utf8', 'latin1', 'ascii'];
    let bestText = '';
    for (const encoding of encodings) {
      const text = pdfBuffer.toString(encoding as BufferEncoding);
      const readableTextRegex = /[A-Za-z][A-Za-z0-9\s\.,!?;:\-()\[\]"']{20,}/g;
      const matches = text.match(readableTextRegex);
      if (matches && matches.length > 0) {
        const extractedText = matches
          .filter(match => {
            const lowerMatch = match.toLowerCase();
            return !match.includes('obj') &&
                   !match.includes('endobj') &&
                   !match.includes('stream') &&
                   !match.includes('endstream') &&
                   !match.includes('Filter') &&
                   !match.includes('Length') &&
                   !match.includes('xref') &&
                   !match.includes('/Type') &&
                   !match.includes('/Subtype') &&
                   !match.includes('/Page') &&
                   !match.includes('/Contents') &&
                   !match.includes('/Resources') &&
                   !match.includes('/MediaBox') &&
                   !match.includes('/Parent') &&
                   !match.includes('/Font') &&
                   !match.includes('/Encoding') &&
                   !match.includes('Annot') &&
                   !match.includes('Link') &&
                   !lowerMatch.includes('mediabox') &&
                   !lowerMatch.includes('annotation') &&
                   !lowerMatch.includes('cross-reference') &&
                   !lowerMatch.includes('pdf structure') &&
                   !lowerMatch.includes('hyperlink') &&
                   !lowerMatch.includes('font encoding') &&
                   match.split(' ').length >= 5 &&
                   /[.!?]/.test(match);
          })
          .slice(0, 50)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (extractedText.length > bestText.length) {
          bestText = extractedText;
        }
      }
    }
    bestText = bestText
      .replace(/\b\d+\s+\d+\s+obj\b/g, '')
      .replace(/\b(R|obj|endobj)\b/g, '')
      .replace(/\/[A-Z][A-Za-z]+/g, '')
      .replace(/\[\s*\d+(\s+\d+)*\s*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`🔍 Advanced extraction found ${bestText.length} characters of cleaned content`);
    return bestText;
  } catch (error) {
    console.error("Error in advanced buffer extraction:", error);
    return '';
  }

async function extractDirectContent(pdfBuffer: Buffer): Promise<string> {
  try {
    const text = pdfBuffer.toString('utf8');
    const sentencePatterns = [
      /[A-Z][^.!?]*[.!?]/g,
      /[A-Z][^.!?]*[.!?]\s+[A-Z][^.!?]*[.!?]/g,
      /\b(The|This|That|It|In|On|For|With|When|Where|Why|How|Because|Since|Although|However|Therefore|Moreover|Furthermore)\s+[^.!?]{20,}[.!?]/gi
    ];
    let allMatches: string[] = [];
    for (const pattern of sentencePatterns) {
      const matches = text.match(pattern) || [];
      allMatches = allMatches.concat(matches);
    }
    if (allMatches.length === 0) {
      return '';
    }
    const cleanedMatches = allMatches
      .filter(match => {
        const lowerMatch = match.toLowerCase();
        return !lowerMatch.includes('mediabox') &&
               !lowerMatch.includes('annotation') &&
               !lowerMatch.includes('cross-reference') &&
               !lowerMatch.includes('hyperlink') &&
               !lowerMatch.includes('pdf structure') &&
               !lowerMatch.includes('font encoding') &&
               !lowerMatch.includes('/type') &&
               !lowerMatch.includes('/subtype') &&
               !match.includes('obj') &&
               !match.includes('endobj')
               && match.length > 20
               && match.split(' ').length >= 4;
      })
      .map(match => match.trim())
      .filter((match, index, arr) => arr.indexOf(match) === index)
      .slice(0, 30);
    const result = cleanedMatches.join(' ').replace(/\s+/g, ' ').trim();
    console.log(`🔍 Direct content extraction found ${result.length} characters`);
    return result;
  } catch (error) {
    console.error('Error in direct content extraction:', error);
    return '';
  }
// End of file
async function extractTextFromPage(pdfBuffer: Buffer, pageIndex: number): Promise<string> {
  try {
    // Convert buffer to string and look for text objects on specific page
    const pdfString = pdfBuffer.toString('binary');
    // Look for text showing operations like "BT...ET" (Begin Text...End Text)
    const textBlockRegex = new RegExp('BT\\s+(.*?)\\s+ET', 'g');
    const textMatches = pdfString.match(textBlockRegex);
    if (textMatches && textMatches.length > pageIndex) {
      const pageTextBlock = textMatches[pageIndex];
      // Extract text from within parentheses and brackets - improved for actual content
      const textContentRegex = /\((.*?)\)|<(.*?)>/g;
      let match;
      const texts = [];
      while ((match = textContentRegex.exec(pageTextBlock)) !== null) {
        const text = match[1] || match[2];
        if (text && text.length > 3) {
          // Decode basic PDF text encoding
          let decoded = text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\(\d{3})/g, (_: string, octal: string) => String.fromCharCode(parseInt(octal, 8)));
          // Filter out PDF technical terms and keep meaningful content
          const lowerDecoded = decoded.toLowerCase();
          const isPdfTechnical = /^(\/[A-Z]|obj|endobj|stream|filter|length|xref|type|subtype|page|contents|resources|mediabox|parent|font|encoding|annot|link)$/i.test(decoded.trim()) ||
                                lowerDecoded.includes('mediabox') ||
                                lowerDecoded.includes('annotation') ||
                                lowerDecoded.includes('cross-reference') ||
                                lowerDecoded.includes('hyperlink') ||
                                /^\d+\s+\d+\s+R$/.test(decoded.trim()) ||
                                /^\/[A-Z]/.test(decoded.trim());
          // Only include text that appears to be actual document content
          if (!isPdfTechnical && 
              decoded.length > 5 && 
              /[a-zA-Z]/.test(decoded) && 
              !/^[\d\s\/\[\]<>]+$/.test(decoded)) {
            texts.push(decoded);
          }
        }
      }
      return texts.join(' ').trim();
    }
    return '';
  } catch (error) {
    console.error(`Error extracting text from page ${pageIndex}:`, error);
    return '';
  }

async function extractTextFromBufferAdvanced(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert to different encodings and look for readable text
    const encodings = ['utf8', 'latin1', 'ascii'];
    let bestText = '';
    
    for (const encoding of encodings) {
      const text = pdfBuffer.toString(encoding as BufferEncoding);
      
      // Look for patterns that indicate readable text (improved filtering)
      const readableTextRegex = /[A-Za-z][A-Za-z0-9\s\.\,\!\?\;\:\-\(\)\[\]\"\']{20,}/g;
      const matches = text.match(readableTextRegex);
      
      if (matches && matches.length > 0) {
        const extractedText = matches
          .filter(match => {
            // Enhanced filtering to exclude PDF technical content
            const lowerMatch = match.toLowerCase();
            return !match.includes('obj') && 
                   !match.includes('endobj') && 
                   !match.includes('stream') &&
                   !match.includes('endstream') &&
                   !match.includes('Filter') &&
                   !match.includes('Length') &&
                   !match.includes('xref') &&
                   !match.includes('/Type') &&
                   !match.includes('/Subtype') &&
                   !match.includes('/Page') &&
                   !match.includes('/Contents') &&
                   !match.includes('/Resources') &&
                   !match.includes('/MediaBox') &&
                   !match.includes('/Parent') &&
                   !match.includes('/Font') &&
                   !match.includes('/Encoding') &&
                   !match.includes('Annot') &&
                   !match.includes('Link') &&
                   !lowerMatch.includes('mediabox') &&
                   !lowerMatch.includes('annotation') &&
                   !lowerMatch.includes('cross-reference') &&
                   !lowerMatch.includes('pdf structure') &&
                   !lowerMatch.includes('hyperlink') &&
                   !lowerMatch.includes('font encoding') &&
                   match.split(' ').length >= 5 && // At least 5 words for meaningful content
                   /[.!?]/.test(match); // Contains sentence-ending punctuation
          })
          .slice(0, 50) // Limit to first 50 matches to get varied content
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (extractedText.length > bestText.length) {
          bestText = extractedText;
        }
      }
    }
    
    // Additional cleaning to remove remaining PDF artifacts
    bestText = bestText
      .replace(/\b\d+\s+\d+\s+obj\b/g, '') // Remove object references
      .replace(/\b(R|obj|endobj)\b/g, '') // Remove PDF keywords
      .replace(/\/[A-Z][A-Za-z]+/g, '') // Remove PDF dictionary keys
      .replace(/\[\s*\d+(\s+\d+)*\s*\]/g, '') // Remove arrays of numbers
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🔍 Advanced extraction found ${bestText.length} characters of cleaned content`);
    
    return bestText;
  } catch (error) {
    console.error("Error in advanced buffer extraction:", error);
    return '';
  }
}

async function extractDirectContent(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert buffer to text and look for sentences/paragraphs directly
    const text = pdfBuffer.toString('utf8');
    
    // Look for patterns that represent actual readable sentences
    const sentencePatterns = [
      // Complete sentences with proper punctuation
      /[A-Z][^.!?]*[.!?]/g,
      // Paragraphs with multiple sentences
      /[A-Z][^.!?]*[.!?]\s+[A-Z][^.!?]*[.!?]/g,
      // Common English sentence starters
      /\b(The|This|That|It|In|On|For|With|When|Where|Why|How|Because|Since|Although|However|Therefore|Moreover|Furthermore)\s+[^.!?]{20,}[.!?]/gi
    ];
    
    let allMatches: string[] = [];
    
    for (const pattern of sentencePatterns) {
      const matches = text.match(pattern) || [];
      allMatches = allMatches.concat(matches);
    }
    
    if (allMatches.length === 0) {
      return '';
    }
    
    // Filter and clean the matches
    const cleanedMatches = allMatches
      .filter(match => {
        const lowerMatch = match.toLowerCase();
        // Exclude PDF-specific content
        return !lowerMatch.includes('mediabox') &&
               !lowerMatch.includes('annotation') &&
               !lowerMatch.includes('cross-reference') &&
               !lowerMatch.includes('hyperlink') &&
               !lowerMatch.includes('pdf structure') &&
               !lowerMatch.includes('font encoding') &&
               !lowerMatch.includes('/type') &&
               !lowerMatch.includes('/subtype') &&
               !match.includes('obj') &&
               !match.includes('endobj')
               && match.length > 20
               && match.split(' ').length >= 4;
      })
      .map(match => match.trim())
      .filter((match, index, arr) => arr.indexOf(match) === index) // Remove duplicates
      .slice(0, 30); // Limit to 30 sentences
    const result = cleanedMatches.join(' ').replace(/\s+/g, ' ').trim();
    console.log(`🔍 Direct content extraction found ${result.length} characters`);
    return result;
  } catch (error) {
    console.error('Error in direct content extraction:', error);
    return '';
  }
}
