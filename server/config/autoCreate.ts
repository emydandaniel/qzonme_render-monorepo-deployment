// Auto Create Quiz Server Configuration
// Use function to ensure fresh environment variable access
export const AUTO_CREATE_SERVER_CONFIG = {
  // API Keys - using getter functions to ensure fresh access
  get GOOGLE_AI_STUDIO_API_KEY() { return process.env.GOOGLE_AI_STUDIO_API_KEY; },
  get YOUTUBE_API_KEY() { return process.env.YOUTUBE_API_KEY; },
  
  // Rate limiting
  DAILY_LIMIT: parseInt(process.env.AUTO_CREATE_DAILY_LIMIT || "3"),
  
  // Content extraction timeouts
  WEB_SCRAPING_TIMEOUT: parseInt(process.env.WEB_SCRAPING_TIMEOUT || "30000"),
  YOUTUBE_TRANSCRIPT_TIMEOUT: parseInt(process.env.YOUTUBE_TRANSCRIPT_TIMEOUT || "15000"),
  
  // Cache settings
  CONTENT_CACHE_TTL: parseInt(process.env.CONTENT_CACHE_TTL || "3600"),
  
  // AI generation settings
  AI_GENERATION_TIMEOUT: 60000,
  MAX_RETRIES: 3,
  
  // Validation
  MAX_FILE_SIZE: parseInt(process.env.AUTO_CREATE_MAX_FILE_SIZE || "10485760"),
  SUPPORTED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
  
  // OCR settings
  OCR_QUALITY_THRESHOLD: parseFloat(process.env.OCR_QUALITY_THRESHOLD || "0.7")
};

// Validation function for server config
export const validateServerConfig = (): { isValid: boolean, missingKeys: string[] } => {
  const requiredKeys = [
    'GOOGLE_AI_STUDIO_API_KEY',
    'YOUTUBE_API_KEY'
  ];
  
  // Debug: Log the actual environment values
  console.log('🔍 Environment variables debug:');
  console.log('- process.env.GOOGLE_AI_STUDIO_API_KEY:', process.env.GOOGLE_AI_STUDIO_API_KEY ? 'SET (length: ' + process.env.GOOGLE_AI_STUDIO_API_KEY.length + ')' : 'NOT SET');
  console.log('- process.env.YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'SET (length: ' + process.env.YOUTUBE_API_KEY.length + ')' : 'NOT SET');
  console.log('- AUTO_CREATE_SERVER_CONFIG.GOOGLE_AI_STUDIO_API_KEY:', AUTO_CREATE_SERVER_CONFIG.GOOGLE_AI_STUDIO_API_KEY ? 'SET' : 'NOT SET');
  console.log('- AUTO_CREATE_SERVER_CONFIG.YOUTUBE_API_KEY:', AUTO_CREATE_SERVER_CONFIG.YOUTUBE_API_KEY ? 'SET' : 'NOT SET');
  
  const missingKeys = requiredKeys.filter(key => {
    const value = AUTO_CREATE_SERVER_CONFIG[key as keyof typeof AUTO_CREATE_SERVER_CONFIG];
    return !value || value === '' || value === undefined || value === null;
  });
  
  // Log configuration status for debugging
  console.log('🔧 Auto-Create Config Validation:');
  console.log(`- GOOGLE_AI_STUDIO_API_KEY: ${AUTO_CREATE_SERVER_CONFIG.GOOGLE_AI_STUDIO_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- YOUTUBE_API_KEY: ${AUTO_CREATE_SERVER_CONFIG.YOUTUBE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  
  if (missingKeys.length > 0) {
    console.warn('⚠️ Missing API keys:', missingKeys);
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys
  };
};

// Helper function to check if auto-create is properly configured
export const isAutoCreateEnabled = (): boolean => {
  const { isValid } = validateServerConfig();
  return isValid;
};