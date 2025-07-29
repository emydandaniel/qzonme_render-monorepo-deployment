import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { body, validationResult, param, query } from 'express-validator';

/**
 * Enhanced validation middleware using express-validator for additional security
 */

// Common validation patterns
export const ValidationPatterns = {
  // Safe string without HTML/script content
  safeString: (field: string, min = 1, max = 255) => 
    body(field)
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`)
      .matches(/^[^<>]*$/)
      .withMessage(`${field} cannot contain HTML tags`)
      .escape(), // HTML escape for extra safety

  // Safe alphanumeric string (for IDs, codes, etc.)
  alphanumeric: (field: string, min = 1, max = 50) =>
    body(field)
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`)
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(`${field} can only contain letters, numbers, hyphens, and underscores`),

  // Email validation
  email: (field: string) =>
    body(field)
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail(),

  // URL validation
  url: (field: string, optional = false) => {
    const validator = body(field).isURL({
      protocols: ['http', 'https'],
      require_protocol: true
    }).withMessage('Must be a valid URL');
    return optional ? validator.optional() : validator;
  },

  // Positive integer validation
  positiveInt: (field: string) =>
    body(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`)
      .toInt(),

  // Boolean validation
  boolean: (field: string) =>
    body(field)
      .isBoolean()
      .withMessage(`${field} must be a boolean value`)
      .toBoolean(),

  // Array validation
  array: (field: string, minLength = 1, maxLength = 100) =>
    body(field)
      .isArray({ min: minLength, max: maxLength })
      .withMessage(`${field} must be an array with ${minLength}-${maxLength} items`),

  // JSON validation
  json: (field: string) =>
    body(field)
      .custom((value) => {
        try {
          JSON.parse(value);
          return true;
        } catch {
          throw new Error(`${field} must be valid JSON`);
        }
      }),
};

// Validation for quiz creation
export const validateQuizCreation = [
  ValidationPatterns.safeString('creatorName', 1, 100),
  ValidationPatterns.alphanumeric('accessCode', 8, 8),
  ValidationPatterns.alphanumeric('urlSlug', 5, 200),
  ValidationPatterns.safeString('dashboardToken', 10, 500),
  ValidationPatterns.positiveInt('creatorId'),
  
  // Custom validation for access code format
  body('accessCode').custom((value) => {
    if (!/^[a-z0-9]+$/.test(value)) {
      throw new Error('Access code can only contain lowercase letters and numbers');
    }
    return true;
  }),
  
  // Custom validation for URL slug format
  body('urlSlug').custom((value) => {
    if (!/^[a-z0-9-]+$/.test(value)) {
      throw new Error('URL slug can only contain lowercase letters, numbers, and hyphens');
    }
    return true;
  }),
];

// Validation for question creation
export const validateQuestionCreation = [
  ValidationPatterns.positiveInt('quizId'),
  ValidationPatterns.safeString('text', 1, 1000),
  body('type').equals('multiple-choice').withMessage('Question type must be multiple-choice'),
  ValidationPatterns.array('options', 2, 10),
  ValidationPatterns.array('correctAnswers', 1, 10),
  ValidationPatterns.safeString('hint', 0, 500).optional(),
  ValidationPatterns.positiveInt('order'),
  ValidationPatterns.url('imageUrl', true), // Optional image URL
  
  // Validate each option in the options array
  body('options.*')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be between 1 and 200 characters')
    .matches(/^[^<>]*$/)
    .withMessage('Options cannot contain HTML tags')
    .escape(),
    
  // Validate each correct answer
  body('correctAnswers.*')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each correct answer must be between 1 and 200 characters')
    .escape(),
];

// Validation for quiz attempts
export const validateQuizAttempt = [
  ValidationPatterns.positiveInt('quizId'),
  ValidationPatterns.positiveInt('userAnswerId'),
  ValidationPatterns.safeString('userName', 1, 100),
  body('score').isInt({ min: 0, max: 1000 }).withMessage('Score must be between 0 and 1000').toInt(),
  body('totalQuestions').isInt({ min: 1, max: 1000 }).withMessage('Total questions must be between 1 and 1000').toInt(),
  ValidationPatterns.array('answers', 1, 1000),
  
  // Validate each answer in the answers array
  body('answers.*.questionId').isInt({ min: 1 }).withMessage('Question ID must be a positive integer').toInt(),
  body('answers.*.userAnswer').custom((value) => {
    // Can be string or array of strings
    if (typeof value === 'string') {
      return value.length <= 500; // Limit answer length
    } else if (Array.isArray(value)) {
      return value.every(item => typeof item === 'string' && item.length <= 500);
    }
    throw new Error('User answer must be a string or array of strings');
  }),
  body('answers.*.isCorrect').optional().isBoolean().toBoolean(),
];

// Validation for contact form
export const validateContact = [
  ValidationPatterns.safeString('name', 1, 100),
  ValidationPatterns.email('email'),
  ValidationPatterns.safeString('subject', 1, 200),
  ValidationPatterns.safeString('message', 10, 2000),
  
  // Additional security check for suspicious content
  body('message').custom((value) => {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(value))) {
      throw new Error('Message contains suspicious content');
    }
    return true;
  }),
];

// Validation for admin login
export const validateAdminLogin = [
  ValidationPatterns.safeString('username', 3, 50),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
    
  // Rate limiting check (additional to middleware)
  body().custom((value, { req }) => {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    // This would integrate with your existing rate limiting logic
    return true;
  }),
];

// Validation for file uploads
export const validateFileUpload = [
  body('quizId').optional().isInt({ min: 1 }).withMessage('Quiz ID must be a positive integer').toInt(),
  
  // Custom file validation (works with multer)
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check file size (additional to multer limits)
    if (req.file.size > 10 * 1024 * 1024) { // 10MB
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
    }
    
    // Check filename for suspicious content
    const filename = req.file.originalname.toLowerCase();
    const suspiciousExtensions = ['.php', '.asp', '.jsp', '.exe', '.bat', '.cmd', '.sh'];
    if (suspiciousExtensions.some(ext => filename.includes(ext))) {
      return res.status(400).json({ error: 'Suspicious file detected' });
    }
    
    next();
  },
];

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));
    
    // Log validation errors for security monitoring
    console.warn(`🚨 Validation failed for ${req.method} ${req.path}:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      errors: errorMessages,
      body: process.env.NODE_ENV === 'development' ? req.body : '[REDACTED]'
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'The provided data is invalid',
      details: errorMessages
    });
  }
  
  next();
};

// Parameter validation for route parameters
export const validateParam = {
  id: param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer').toInt(),
  quizId: param('quizId').isInt({ min: 1 }).withMessage('Quiz ID must be a positive integer').toInt(),
  questionId: param('questionId').isInt({ min: 1 }).withMessage('Question ID must be a positive integer').toInt(),
  accessCode: param('accessCode').matches(/^[a-z0-9]{8}$/).withMessage('Invalid access code format'),
  urlSlug: param('urlSlug').matches(/^[a-z0-9-]{5,200}$/).withMessage('Invalid URL slug format'),
};

// Query parameter validation
export const validateQuery = {
  page: query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  search: query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long').escape(),
};

/**
 * Combined validation middleware that runs both express-validator and Zod
 */
export const createValidationMiddleware = (
  expressValidators: any[],
  zodSchema?: z.ZodSchema<any>
) => {
  return [
    ...expressValidators,
    handleValidationErrors,
    ...(zodSchema ? [(req: Request, res: Response, next: NextFunction) => {
      try {
        req.body = zodSchema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Schema validation failed',
            message: 'Data format is invalid',
            details: error.errors
          });
        }
        next(error);
      }
    }] : [])
  ];
};
