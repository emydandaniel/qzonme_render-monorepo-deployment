import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

export interface DocumentProcessingResult {
  success: boolean;
  text: string;
  processingTime: number;
  wordCount: number;
  fileType: string;
  error?: string;
}

/**
 * Extract text from TXT files
 */
export async function extractTextFromTXT(filePath: string): Promise<DocumentProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log('📄 Processing TXT file:', filePath);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const wordCount = content.trim().split(/\s+/).length;
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ TXT processing completed: ${wordCount} words in ${processingTime}ms`);
    
    return {
      success: true,
      text: content.trim(),
      processingTime,
      wordCount,
      fileType: 'TXT'
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ TXT processing failed:', error);
    
    return {
      success: false,
      text: '',
      processingTime,
      wordCount: 0,
      fileType: 'TXT',
      error: error instanceof Error ? error.message : 'TXT processing failed'
    };
  }
}

/**
 * Extract text from DOC files using mammoth
 */
export async function extractTextFromDOC(filePath: string): Promise<DocumentProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log('📄 Processing DOC file:', filePath);
    
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    const text = result.value.trim();
    const wordCount = text.split(/\s+/).length;
    const processingTime = Date.now() - startTime;
    
    // Log any warnings from mammoth
    if (result.messages && result.messages.length > 0) {
      console.warn('⚠️ DOC processing warnings:', result.messages);
    }
    
    console.log(`✅ DOC processing completed: ${wordCount} words in ${processingTime}ms`);
    
    return {
      success: true,
      text,
      processingTime,
      wordCount,
      fileType: 'DOC'
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ DOC processing failed:', error);
    
    return {
      success: false,
      text: '',
      processingTime,
      wordCount: 0,
      fileType: 'DOC',
      error: error instanceof Error ? error.message : 'DOC processing failed'
    };
  }
}

/**
 * Extract text from DOCX files using mammoth
 */
export async function extractTextFromDOCX(filePath: string): Promise<DocumentProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log('📄 Processing DOCX file:', filePath);
    
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    const text = result.value.trim();
    const wordCount = text.split(/\s+/).length;
    const processingTime = Date.now() - startTime;
    
    // Log any warnings from mammoth
    if (result.messages && result.messages.length > 0) {
      console.warn('⚠️ DOCX processing warnings:', result.messages);
    }
    
    console.log(`✅ DOCX processing completed: ${wordCount} words in ${processingTime}ms`);
    
    return {
      success: true,
      text,
      processingTime,
      wordCount,
      fileType: 'DOCX'
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ DOCX processing failed:', error);
    
    return {
      success: false,
      text: '',
      processingTime,
      wordCount: 0,
      fileType: 'DOCX',
      error: error instanceof Error ? error.message : 'DOCX processing failed'
    };
  }
}

/**
 * Universal document processor - routes to appropriate service based on file extension
 */
export async function extractTextFromDocument(filePath: string): Promise<DocumentProcessingResult> {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.txt':
      return await extractTextFromTXT(filePath);
    case '.doc':
      return await extractTextFromDOC(filePath);
    case '.docx':
      return await extractTextFromDOCX(filePath);
    default:
      return {
        success: false,
        text: '',
        processingTime: 0,
        wordCount: 0,
        fileType: ext.substring(1).toUpperCase(),
        error: `Unsupported document type: ${ext}`
      };
  }
}

/**
 * Check if a file is a supported document type
 */
export function isDocumentFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.txt', '.doc', '.docx'].includes(ext);
}

/**
 * Validate document file before processing
 */
export async function validateDocumentFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const stats = await fs.stat(filePath);
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `Document file too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: 10MB)`
      };
    }
    
    // Check if extension is supported
    const ext = path.extname(filePath).toLowerCase();
    if (!['.txt', '.doc', '.docx'].includes(ext)) {
      return {
        valid: false,
        error: `Unsupported document type: ${ext}`
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid document file'
    };
  }
}
