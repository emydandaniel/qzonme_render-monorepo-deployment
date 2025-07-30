// Auto Create Quiz Configuration
export const AUTO_CREATE_CONFIG = {
  // Rate limiting
  DAILY_LIMIT: parseInt(process.env.AUTO_CREATE_DAILY_LIMIT || "3"),
  
  // File upload settings
  MAX_FILE_SIZE: parseInt(process.env.AUTO_CREATE_MAX_FILE_SIZE || "10485760"), // 10MB
  SUPPORTED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
  MAX_FILES_PER_UPLOAD: 5,
  
  // Supported languages for AI generation
  SUPPORTED_LANGUAGES: [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Dutch', 'Russian', 'Chinese (Simplified)', 
    'Japanese', 'Korean', 'Arabic', 'Hindi'
  ],
  
  // Question generation settings
  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 50,
  DEFAULT_DIFFICULTY: 'Medium' as const,
  DEFAULT_LANGUAGE: 'English',
  DIFFICULTY_LEVELS: ['Easy', 'Medium', 'Hard'] as const,
  
  // OCR settings
  OCR_QUALITY_THRESHOLD: parseFloat(process.env.OCR_QUALITY_THRESHOLD || "0.7"),
  TESSERACT_OPTIONS: {
    logger: (m: any) => console.log(m),
    errorHandler: (err: any) => console.error('Tesseract error:', err)
  },
  
  // Content extraction settings
  WEB_SCRAPING_TIMEOUT: parseInt(process.env.WEB_SCRAPING_TIMEOUT || "30000"),
  YOUTUBE_TRANSCRIPT_TIMEOUT: parseInt(process.env.YOUTUBE_TRANSCRIPT_TIMEOUT || "15000"),
  CONTENT_CACHE_TTL: parseInt(process.env.CONTENT_CACHE_TTL || "3600"), // 1 hour
  
  // AI generation settings
  AI_GENERATION_TIMEOUT: 60000, // 1 minute
  MAX_RETRIES: 3,
  QUESTION_VALIDATION_RULES: {
    MIN_QUESTION_LENGTH: 10,
    MAX_QUESTION_LENGTH: 500,
    REQUIRED_OPTIONS_COUNT: 4,
    MIN_OPTION_LENGTH: 1,
    MAX_OPTION_LENGTH: 200
  }
} as const;

// Type definitions
export type DifficultyLevel = typeof AUTO_CREATE_CONFIG.DIFFICULTY_LEVELS[number];
export type SupportedLanguage = typeof AUTO_CREATE_CONFIG.SUPPORTED_LANGUAGES[number];

// Validation functions
export const validateFileType = (fileName: string): boolean => {
  const extension = '.' + fileName.split('.').pop()?.toLowerCase();
  return AUTO_CREATE_CONFIG.SUPPORTED_FILE_TYPES.includes(extension);
};

export const validateFileSize = (fileSize: number): boolean => {
  return fileSize <= AUTO_CREATE_CONFIG.MAX_FILE_SIZE;
};

export const validateQuestionCount = (count: number): boolean => {
  return count >= AUTO_CREATE_CONFIG.MIN_QUESTIONS && count <= AUTO_CREATE_CONFIG.MAX_QUESTIONS;
};

export const validateLanguage = (language: string): boolean => {
  return AUTO_CREATE_CONFIG.SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
};

export const validateDifficulty = (difficulty: string): boolean => {
  return AUTO_CREATE_CONFIG.DIFFICULTY_LEVELS.includes(difficulty as DifficultyLevel);
};