import { AUTO_CREATE_CONFIG, validateFileType, validateFileSize } from "@shared/autoCreateConfig";

// File validation utilities
export const validateUploadedFiles = (files: File[]): { valid: File[], errors: string[] } => {
  const valid: File[] = [];
  const errors: string[] = [];
  
  if (files.length > AUTO_CREATE_CONFIG.MAX_FILES_PER_UPLOAD) {
    errors.push(`Maximum ${AUTO_CREATE_CONFIG.MAX_FILES_PER_UPLOAD} files allowed`);
    return { valid, errors };
  }
  
  files.forEach((file, index) => {
    if (!validateFileType(file.name)) {
      errors.push(`File ${index + 1}: Unsupported file type. Supported: ${AUTO_CREATE_CONFIG.SUPPORTED_FILE_TYPES.join(', ')}`);
    } else if (!validateFileSize(file.size)) {
      errors.push(`File ${index + 1}: File too large. Maximum size: ${(AUTO_CREATE_CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`);
    } else {
      valid.push(file);
    }
  });
  
  return { valid, errors };
};

// URL validation utilities
export const validateURL = (url: string): { isValid: boolean, type: 'youtube' | 'web' | 'invalid' } => {
  if (!url.trim()) return { isValid: false, type: 'invalid' };
  
  try {
    const urlObj = new URL(url);
    
    // Check for YouTube URLs
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      return { isValid: true, type: 'youtube' };
    }
    
    // Check for valid web URLs
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return { isValid: true, type: 'web' };
    }
    
    return { isValid: false, type: 'invalid' };
  } catch {
    return { isValid: false, type: 'invalid' };
  }
};

// Content validation utilities
export const validateContentSources = (files: File[], topicPrompt: string, linkUrl: string): boolean => {
  return files.length > 0 || topicPrompt.trim().length > 0 || linkUrl.trim().length > 0;
};

// Progress calculation utilities
export const calculateProgress = (currentStep: string, subProgress: number = 0): number => {
  const stepWeights = {
    'input': 0,
    'processing': 30,
    'generation': 60,
    'review': 90,
    'publish': 100
  };
  
  const baseProgress = stepWeights[currentStep as keyof typeof stepWeights] || 0;
  const stepRange = currentStep === 'processing' ? 30 : currentStep === 'generation' ? 30 : 10;
  
  return Math.min(100, baseProgress + (subProgress * stepRange / 100));
};

// File type detection utilities
export const getFileTypeInfo = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const fileTypes = {
    pdf: { name: 'PDF Document', color: 'text-red-500', category: 'document' },
    doc: { name: 'Word Document', color: 'text-blue-500', category: 'document' },
    docx: { name: 'Word Document', color: 'text-blue-500', category: 'document' },
    txt: { name: 'Text File', color: 'text-gray-500', category: 'document' },
    jpg: { name: 'JPEG Image', color: 'text-green-500', category: 'image' },
    jpeg: { name: 'JPEG Image', color: 'text-green-500', category: 'image' },
    png: { name: 'PNG Image', color: 'text-green-500', category: 'image' }
  };
  
  return fileTypes[extension as keyof typeof fileTypes] || { 
    name: 'Unknown File', 
    color: 'text-gray-400', 
    category: 'unknown' 
  };
};

// Usage tracking utilities
export const getTodayUsageKey = (): string => {
  const today = new Date().toDateString();
  return `auto_create_usage_${today}`;
};

export const getDailyUsageCount = (): number => {
  const usageKey = getTodayUsageKey();
  return parseInt(localStorage.getItem(usageKey) || "0");
};

export const incrementDailyUsage = (): number => {
  const usageKey = getTodayUsageKey();
  const currentUsage = getDailyUsageCount();
  const newUsage = currentUsage + 1;
  localStorage.setItem(usageKey, newUsage.toString());
  return newUsage;
};

export const canUseAutoCreate = (): boolean => {
  return getDailyUsageCount() < AUTO_CREATE_CONFIG.DAILY_LIMIT;
};

// Content quality assessment utilities
export const assessContentQuality = (content: string): { score: number, suggestions: string[] } => {
  const suggestions: string[] = [];
  let score = 10; // Start with perfect score
  
  // Length assessment
  if (content.length < 100) {
    score -= 3;
    suggestions.push("Content is quite short. More content will help generate better questions.");
  } else if (content.length < 500) {
    score -= 1;
    suggestions.push("Consider providing more detailed content for richer questions.");
  }
  
  // Structure assessment
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 3) {
    score -= 2;
    suggestions.push("Content has few sentences. More structured content works better.");
  }
  
  // Clarity assessment (basic)
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  if (avgWordLength > 8) {
    score -= 1;
    suggestions.push("Content contains many long words. Simpler language may work better.");
  }
  
  // Ensure score is between 1-10
  score = Math.max(1, Math.min(10, score));
  
  if (score >= 8) {
    suggestions.unshift("Great content quality! This should generate excellent questions.");
  } else if (score >= 6) {
    suggestions.unshift("Good content quality. Should generate solid questions.");
  } else {
    suggestions.unshift("Content quality could be improved for better question generation.");
  }
  
  return { score, suggestions };
};

// Error handling utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

// Format utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};