import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import compression from 'compression';

/**
 * Production-ready security middleware configuration
 */

// Enhanced rate limiting with different limits for different endpoints
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use default key generator (handles IPv6 properly)
    // keyGenerator: default key generator handles IPv6 correctly
    // Skip successful requests in some cases
    skipSuccessfulRequests: false,
    // Skip failed requests
    skipFailedRequests: false,
  });
};

// Different rate limits for different endpoint types
export const rateLimiters = {
  // General API rate limit - applies to all API routes
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many API requests from this IP, please try again later.'
  ),
  
  // Strict rate limit for authentication endpoints
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 login attempts per windowMs
    'Too many authentication attempts from this IP, please try again later.'
  ),
  
  // Rate limit for quiz creation
  createQuiz: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    3, // limit each IP to 3 quiz creations per 5 minutes
    'Too many quiz creation attempts, please try again later.'
  ),
  
  // Rate limit for file uploads
  upload: createRateLimit(
    10 * 60 * 1000, // 10 minutes
    10, // limit each IP to 10 uploads per 10 minutes
    'Too many file upload attempts, please try again later.'
  ),
  
  // Rate limit for auto-create feature (more restrictive)
  autoCreate: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // limit each IP to 3 auto-creates per hour
    'Auto-create limit reached. Please try again in an hour.'
  ),
  
  // Rate limit for quiz attempts
  quizAttempt: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    20, // limit each IP to 20 quiz attempts per 5 minutes
    'Too many quiz attempts, please slow down.'
  )
};

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, you should specify your actual domain(s)
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:3000',
      'https://qzonme.com',
      'https://www.qzonme.com',
      // Render.com domains for deployment
      'https://qzonme-frontend.onrender.com',
      'https://qzonme-api.onrender.com',
      // Allow any *.onrender.com domain for your services
      'https://qzonme-frontend-*.onrender.com',
      'https://qzonme-api-*.onrender.com',
    ];
    
    // For development, allow any localhost origin
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // For production, allow Render.com domains
    if (process.env.NODE_ENV === 'production' && origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// Security headers configuration
const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Needed for Tailwind CSS and development
        "https://fonts.googleapis.com"
      ],
      scriptSrc: [
        "'self'",
        // Development mode needs these for Vite HMR and dev tools
        ...(process.env.NODE_ENV === 'development' ? [
          "'unsafe-inline'", // Allow inline scripts in development
          "'unsafe-eval'", // Allow eval() in development for Vite
          "https://replit.com", // Allow Replit dev banner
          "blob:", // Allow blob: URLs for Vite
          "data:", // Allow data: URLs for Vite
        ] : []),
        // Add Google Analytics if you use it
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:", // Allow blob: URLs for image file previews
        // Cloudinary domains for image uploads
        "https://res.cloudinary.com",
      ],
      connectSrc: [
        "'self'",
        // Development mode websocket for Vite HMR
        ...(process.env.NODE_ENV === 'development' ? [
          "ws://localhost:*",
          "wss://localhost:*",
          "http://localhost:*", // Allow localhost HTTP connections in dev
        ] : []),
        // Production API connections
        ...(process.env.NODE_ENV === 'production' ? [
          "https://*.onrender.com", // Allow connections to Render services
        ] : []),
        // API domains you connect to
        "https://api.together.xyz",
        "https://generativelanguage.googleapis.com",
        "https://vision.googleapis.com", // Google Vision API
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: { action: 'deny' as const },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' as any },
  
  // X-XSS-Protection (deprecated but still good for legacy browsers)
  xssFilter: true,
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
};

// Request logging configuration
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' // Standard Apache combined log format
  : 'dev'; // Colored output for development

// Custom token for request ID (useful for debugging)
morgan.token('request-id', (req: Request) => {
  return (req as any).requestId || 'unknown';
});

// Security middleware setup function
export function setupSecurityMiddleware(app: Express) {
  console.log('🔒 Setting up production security middleware...');
  
  // Request ID generation for better logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
  });
  
  // Trust proxy (important for rate limiting and security headers when behind a proxy)
  app.set('trust proxy', 1);
  
  // Compression middleware (should be early in the stack)
  app.use(compression({
    filter: (req: any, res: any) => {
      // Don't compress if already compressed or if request header says no
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression for everything else
      return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is good balance)
    threshold: 1024, // Only compress if response is larger than 1KB
  }));
  
  // Security headers
  app.use(helmet(helmetConfig));
  
  // CORS middleware
  app.use(cors(corsOptions));
  
  // Request logging
  app.use(morgan(morganFormat));
  
  // General API rate limiting
  app.use('/api', rateLimiters.general);
  
  console.log('✅ Security middleware configured');
}

// Apply specific rate limits to specific routes
export function setupSpecificRateLimits(app: Express) {
  console.log('🔒 Setting up endpoint-specific rate limits...');
  
  // Authentication endpoints
  app.use('/api/admin/login', rateLimiters.auth);
  app.use('/api/contact', rateLimiters.auth); // Contact form also needs protection
  
  // Quiz creation endpoints
  app.use('/api/quizzes', (req, res, next) => {
    if (req.method === 'POST') {
      return rateLimiters.createQuiz(req, res, next);
    }
    next();
  });
  
  // Auto-create endpoints
  app.use('/api/auto-create', rateLimiters.autoCreate);
  
  // File upload endpoints
  app.use('/api/upload', rateLimiters.upload);
  
  // Quiz attempt endpoints
  app.use('/api/quiz-attempts', rateLimiters.quizAttempt);
  
  console.log('✅ Endpoint-specific rate limits configured');
}

// Enhanced error handling middleware
export function setupSecurityErrorHandling(app: Express) {
  // Rate limit error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'File too large',
        message: 'The uploaded file exceeds the maximum allowed size.'
      });
    }
    
    if (err.statusCode === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: err.message || 'Too many requests',
        retryAfter: err.retryAfter
      });
    }
    
    next(err);
  });
  
  // Generic error handler (should be last)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Log error details for debugging (but don't expose them to client)
    console.error(`🚨 Security Error [${(req as any).requestId}]:`, {
      status,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Send generic error response to client
    const message = status === 500 ? 'Internal Server Error' : (err.message || 'An error occurred');
    
    res.status(status).json({
      error: 'Server Error',
      message: message,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
  
  console.log('✅ Security error handling configured');
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize common XSS patterns in request body
  if (req.body && typeof req.body === 'object') {
    const sanitizeString = (str: string): string => {
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
        .trim();
    };
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }
  
  next();
}
