import { z } from "zod";

// Enhanced validation schemas with security considerations
export const secureUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .transform(str => str.trim())
});

export const secureQuizSchema = z.object({
  creatorId: z.number().int().positive(),
  creatorName: z.string()
    .min(1, "Creator name is required")
    .max(100, "Creator name must not exceed 100 characters")
    .transform(str => str.trim()),
  accessCode: z.string()
    .length(8, "Access code must be exactly 8 characters")
    .regex(/^[a-z0-9]+$/, "Access code can only contain lowercase letters and numbers"),
  urlSlug: z.string()
    .min(5, "URL slug must be at least 5 characters")
    .max(200, "URL slug must not exceed 200 characters")
    .regex(/^[a-z0-9-]+$/, "URL slug can only contain lowercase letters, numbers, and hyphens"),
  dashboardToken: z.string()
    .min(10, "Dashboard token must be at least 10 characters")
    .max(500, "Dashboard token must not exceed 500 characters")
});

export const secureQuestionSchema = z.object({
  quizId: z.number().int().positive(),
  text: z.string()
    .min(1, "Question text is required")
    .max(1000, "Question text must not exceed 1000 characters")
    .transform(str => str.trim()),
  type: z.literal("multiple-choice"),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  correctAnswers: z.array(z.string().min(1).max(200)).min(1),
  hint: z.string().max(500).optional().nullable(),
  order: z.number().int().min(0).max(1000),
  imageUrl: z.string().url().max(2000).optional().nullable()
});

export const secureQuizAttemptSchema = z.object({
  quizId: z.number().int().positive(),
  userAnswerId: z.number().int().positive(),
  userName: z.string()
    .min(1, "User name is required")
    .max(100, "User name must not exceed 100 characters")
    .transform(str => str.trim()),
  score: z.number().int().min(0).max(1000),
  totalQuestions: z.number().int().min(1).max(1000),
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    userAnswer: z.union([z.string(), z.array(z.string())]),
    isCorrect: z.boolean().optional()
  })).min(1).max(1000)
});

// Sanitization functions
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove potentially dangerous characters
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeFilename(filename: string): string {
  // Remove dangerous characters from filenames
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.+/g, ".")
    .substring(0, 255);
}

// Rate limiting helpers
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const rateLimits = {
  createUser: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  createQuiz: { windowMs: 60 * 1000, maxRequests: 3 }, // 3 per minute
  uploadImage: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  submitQuizAttempt: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
};

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const key = ip;
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + config.windowMs });
    return true;
  }

  if (current.count >= config.maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

// Input validation middleware
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors
        });
      }
      return res.status(400).json({ message: "Invalid input" });
    }
  };
}