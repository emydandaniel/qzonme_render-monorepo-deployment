import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertUserSchema, 
  insertQuizSchema, 
  insertQuestionSchema, 
  insertQuizAttemptSchema,
  questionAnswerSchema,
  quizzes,
  quizAttempts,
  questions
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Setup dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup a more permanent uploads directory
// Use absolute path with the project root to avoid relative path issues
const projectRoot = path.resolve(__dirname, '..');
const uploadDir = path.join(projectRoot, 'uploads');
const persistentUploadsDir = path.join(projectRoot, 'persistent_uploads');

console.log('Project root:', projectRoot);
console.log('Upload directories:', { uploadDir, persistentUploadsDir });

// Ensure both directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory: ${uploadDir}`);
}

if (!fs.existsSync(persistentUploadsDir)) {
  fs.mkdirSync(persistentUploadsDir, { recursive: true });
  console.log(`Created persistent uploads directory: ${persistentUploadsDir}`);
}

// Copy any existing files from uploads to persistent_uploads
try {
  const files = fs.readdirSync(uploadDir);
  for (const file of files) {
    const srcPath = path.join(uploadDir, file);
    const destPath = path.join(persistentUploadsDir, file);
    
    // Skip if already exists in persistent dir
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file} to persistent storage`);
    }
  }
} catch (err) {
  console.error('Error copying existing files:', err);
}

// Use the persistent directory for multer storage
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save to both directories for redundancy
    cb(null, persistentUploadsDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    
    console.log(`New upload: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024 // Increased to 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      // @ts-ignore - Multer types aren't perfect
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid user data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  // Quiz routes
  app.post("/api/quizzes", async (req, res) => {
    try {
      const quizData = insertQuizSchema.parse(req.body);
      
      // Additional server-side validation for creator name to prevent the bug
      if (!quizData.creatorName || quizData.creatorName.trim() === '') {
        return res.status(400).json({ 
          message: "Creator name cannot be empty",
          error: "EMPTY_CREATOR_NAME" 
        });
      }
      
      // Extra validation to catch any instance of the known default value
      if (quizData.creatorName.toLowerCase() === 'emydan') {
        console.error("CRITICAL BUG DETECTED: Default name 'emydan' was submitted");
        return res.status(400).json({ 
          message: "Cannot use default creator name. Please enter your own name.",
          error: "DEFAULT_CREATOR_NAME_USED"
        });
      }
      
      console.log(`Creating quiz with creator name: "${quizData.creatorName}"`);
      
      const quiz = await storage.createQuiz(quizData);
      res.status(201).json(quiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quiz data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to create quiz" });
      }
    }
  });
  
  // Get all quizzes (for testing)
  app.get("/api/quizzes", async (req, res) => {
    try {
      // Get all quizzes from the database
      const allQuizzes = await db.select().from(quizzes);
      res.json(allQuizzes);
    } catch (error) {
      console.error("Error fetching all quizzes:", error);
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.get("/api/quizzes/code/:accessCode", async (req, res) => {
    try {
      const accessCode = req.params.accessCode;
      const quiz = await storage.getQuizByAccessCode(accessCode);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Check if the quiz is expired (older than 30 days)
      const isExpired = storage.isQuizExpired(quiz);
      if (isExpired) {
        return res.status(410).json({ 
          message: "Quiz expired", 
          expired: true,
          detail: "This quiz has expired. Quizzes are available for 30 days after creation."
        });
      }
      
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });
  
  app.get("/api/quizzes/slug/:urlSlug", async (req, res) => {
    try {
      const urlSlug = req.params.urlSlug;
      console.log(`Looking up quiz with URL slug: "${urlSlug}"`);
      
      // First, try exact match
      let quiz = await storage.getQuizByUrlSlug(urlSlug);
      
      // If no exact match, try checking if the slug uses a different casing
      if (!quiz) {
        // Get all quizzes from the database
        const allQuizzesList = await db.select().from(quizzes);
        
        // Find a case-insensitive match
        const slugMatch = allQuizzesList.find(q => 
          q.urlSlug.toLowerCase() === urlSlug.toLowerCase()
        );
        
        if (slugMatch) {
          quiz = slugMatch;
          console.log(`Found quiz with case-insensitive match: ${slugMatch.urlSlug}`);
        } else {
          console.log(`No quiz found with URL slug: "${urlSlug}"`);
          return res.status(404).json({ message: "Quiz not found" });
        }
      }
      
      // Check if the quiz is expired (older than 30 days)
      const isExpired = storage.isQuizExpired(quiz);
      if (isExpired) {
        return res.status(410).json({ 
          message: "Quiz expired", 
          expired: true,
          detail: "This quiz has expired. Quizzes are available for 30 days after creation."
        });
      }
      
      res.json(quiz);
    } catch (error) {
      console.error(`Error fetching quiz by slug "${req.params.urlSlug}":`, error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });
  
  // Get quiz by dashboard token
  app.get("/api/quizzes/dashboard/:token", async (req, res) => {
    try {
      const dashboardToken = req.params.token;
      console.log(`Looking up quiz with dashboard token: "${dashboardToken}"`);
      
      // Use the storage function to get the quiz by dashboard token
      const quiz = await storage.getQuizByDashboardToken(dashboardToken);
      
      if (!quiz) {
        console.log(`No quiz found with dashboard token: "${dashboardToken}"`);
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Check if the quiz is expired (older than 30 days)
      const isExpired = storage.isQuizExpired(quiz);
      if (isExpired) {
        return res.status(410).json({ 
          message: "Quiz expired", 
          expired: true,
          detail: "This quiz has expired. Quizzes are available for 30 days after creation."
        });
      }
      
      res.json(quiz);
    } catch (error) {
      console.error(`Error fetching quiz by dashboard token "${req.params.token}":`, error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });
  
  // Get quiz by ID
  app.get("/api/quizzes/:quizId", async (req, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      
      if (isNaN(quizId)) {
        return res.status(400).json({ message: "Invalid quiz ID" });
      }
      
      const quiz = await storage.getQuiz(quizId);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Check if the quiz is expired (older than 30 days)
      const isExpired = storage.isQuizExpired(quiz);
      if (isExpired) {
        return res.status(410).json({ 
          message: "Quiz expired", 
          expired: true,
          detail: "This quiz has expired. Quizzes are available for 30 days after creation."
        });
      }
      
      console.log(`GET /api/quizzes/${quizId} response:`, quiz);
      res.json(quiz);
    } catch (error) {
      console.error(`Error fetching quiz ${req.params.quizId}:`, error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  // Question routes
  app.post("/api/questions", async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(questionData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid question data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to create question" });
      }
    }
  });

  app.get("/api/quizzes/:quizId/questions", async (req, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      
      if (isNaN(quizId)) {
        return res.status(400).json({ message: "Invalid quiz ID" });
      }
      
      const questions = await storage.getQuestionsByQuizId(quizId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Quiz attempt routes
  app.post("/api/quiz-attempts", async (req, res) => {
    try {
      const attemptData = insertQuizAttemptSchema.parse(req.body);
      const attempt = await storage.createQuizAttempt(attemptData);
      res.status(201).json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid attempt data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to create quiz attempt" });
      }
    }
  });

  app.get("/api/quizzes/:quizId/attempts", async (req, res) => {
    try {
      // Add aggressive anti-caching headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const quizId = parseInt(req.params.quizId);
      const timestamp = Date.now(); // For debugging
      
      console.log(`[${timestamp}] Fetching attempts for quiz ${quizId}`);
      
      if (isNaN(quizId)) {
        return res.status(400).json({ message: "Invalid quiz ID" });
      }
      
      // Add a small delay to ensure previous writes have been committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const attempts = await storage.getQuizAttempts(quizId);
      
      console.log(`[${timestamp}] Returning ${attempts.length} attempts for quiz ${quizId}`);
      
      // Add a server timestamp in the response to help client detect freshness
      // Sort attempts by completion date (newest first) for immediate display
      attempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      console.log(`[${timestamp}] Sending sorted attempts: ${attempts.map(a => a.id).join(', ')}`);
      
      res.json({
        data: attempts,
        serverTime: timestamp,
        count: attempts.length
      });
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });
  
  // Get specific quiz attempt by ID
  app.get("/api/quiz-attempts/:attemptId", async (req, res) => {
    try {
      // Add anti-caching headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const attemptId = parseInt(req.params.attemptId);
      const timestamp = Date.now(); // For tracing and debugging
      
      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "Invalid attempt ID" });
      }
      
      console.log(`[${timestamp}] Fetching attempt with ID ${attemptId}`);
      
      // Get all attempt IDs from all quizzes
      // This is a temporary workaround since we don't have a direct getAttemptById method
      const allQuizzesList = await db.select().from(quizzes);
      const allAttempts = [];
      
      // Gather all attempts for all quizzes
      for (const quiz of allQuizzesList) {
        const quizAttempts = await storage.getQuizAttempts(quiz.id);
        allAttempts.push(...quizAttempts);
      }
      
      // Find the specific attempt
      const attempt = allAttempts.find(a => a.id === attemptId);
      
      if (!attempt) {
        console.log(`[${timestamp}] Attempt ID ${attemptId} not found`);
        return res.status(404).json({ message: "Quiz attempt not found" });
      }
      
      console.log(`[${timestamp}] Found attempt ${attemptId} (quiz ${attempt.quizId})`);
      
      // Send with timestamp for caching verification
      res.json({
        data: attempt,
        serverTime: timestamp
      });
    } catch (error) {
      console.error(`Error fetching quiz attempt ${req.params.attemptId}:`, error);
      res.status(500).json({ message: "Failed to fetch quiz attempt" });
    }
  });

  // Verify an answer
  app.post("/api/questions/:questionId/verify", async (req, res) => {
    try {
      const questionId = parseInt(req.params.questionId);
      
      if (isNaN(questionId)) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      const answerData = z.object({
        answer: z.union([z.string(), z.array(z.string())])
      }).parse(req.body);
      
      // Get all questions from the database
      const allQuestions = await db.select().from(questions);
      
      // Find the specific question
      const question = allQuestions.find(q => q.id === questionId);
      
      if (!question) {
        console.error(`[SERVER ERROR] Question not found: ${questionId}`);
        return res.status(404).json({ message: "Question not found" });
      }
      
      let isCorrect = false;
      const correctAnswers = question.correctAnswers as string[];
      const userAnswer = answerData.answer;
      
      // Debug logs to trace the issue
      console.log(`Verifying answer for question ${questionId}:`);
      console.log(`- Correct answers:`, correctAnswers);
      console.log(`- User answer:`, userAnswer);
      
      if (Array.isArray(userAnswer)) {
        // For multiple answers, check if all are correct
        isCorrect = userAnswer.every(ans => 
          correctAnswers.some(correct => 
            correct.toLowerCase().trim() === ans.toLowerCase().trim()
          )
        );
      } else {
        // For single answer, check if it matches any correct answer
        // Use trim() to fix whitespace issues and ensure exact matching
        const normalizedUserAnswer = userAnswer.toString().toLowerCase().trim();
        isCorrect = correctAnswers.some(correct => 
          correct.toLowerCase().trim() === normalizedUserAnswer
        );
      }
      
      console.log(`Answer is ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
      
      // Return both the correctness and the expected answers for debugging
      res.json({ 
        isCorrect,
        debug: {
          questionText: question.text,
          correctAnswers: correctAnswers,
          userAnswer: userAnswer
        }
      });
    } catch (error) {
      console.error("Error verifying answer:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid answer data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to verify answer" });
      }
    }
  });
  
  // Image upload endpoint with enhanced storage
  app.post("/api/upload-image", upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // The file is already saved to persistentUploadsDir
      const originalFilename = req.file.filename;
      const persistentPath = path.join(persistentUploadsDir, originalFilename);
      const standardPath = path.join(uploadDir, originalFilename);
      
      console.log(`Image uploaded: ${originalFilename}`);
      console.log(`- Primary location: ${persistentPath}`);
      
      // Make sure it's also copied to standard uploads directory for redundancy
      try {
        // Only copy if file was initially saved to persistent dir
        if (req.file.path !== standardPath && fs.existsSync(persistentPath)) {
          fs.copyFileSync(persistentPath, standardPath);
          console.log(`- Secondary location: ${standardPath} (redundancy copy created)`);
        }
      } catch (copyErr) {
        console.error(`Warning: Could not create redundancy copy to standard uploads:`, copyErr);
        // Continue anyway as we have the primary copy
      }
      
      // Return the file path that can be used to retrieve the image
      const fileUrl = `/uploads/${originalFilename}`;
      
      // Add cache busting query parameter to ensure fresh loads
      const cacheBustedUrl = `${fileUrl}?t=${Date.now()}`;
      
      res.status(201).json({ 
        imageUrl: fileUrl,
        cacheBustedUrl: cacheBustedUrl,
        filename: originalFilename,
        message: "Image uploaded successfully",
        locations: {
          persistent: fs.existsSync(persistentPath),
          standard: fs.existsSync(standardPath)
        }
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });
  
  // Serve uploaded files with fallback to persistent directory
  app.use('/uploads', (req, res, next) => {
    const fileName = path.basename(req.path);
    const standardPath = path.join(uploadDir, fileName);
    const persistentPath = path.join(persistentUploadsDir, fileName);
    
    // Try to serve from standard uploads directory first
    fs.access(standardPath, fs.constants.F_OK, (standardErr) => {
      if (!standardErr) {
        // File exists in standard directory
        console.log(`Serving ${fileName} from standard uploads directory`);
        return res.sendFile(standardPath);
      }
      
      // If not in standard directory, check persistent directory
      fs.access(persistentPath, fs.constants.F_OK, (persistentErr) => {
        if (!persistentErr) {
          // File exists in persistent directory
          console.log(`Serving ${fileName} from persistent directory`);
          
          // Also copy back to standard directory for future use if possible
          try {
            fs.copyFileSync(persistentPath, standardPath);
            console.log(`Copied ${fileName} back to standard uploads directory`);
          } catch (copyErr) {
            console.error(`Could not copy ${fileName} to standard directory:`, copyErr);
          }
          
          return res.sendFile(persistentPath);
        }
        
        // File not found in either directory
        console.error(`Image not found in either directory: ${fileName}`);
        res.status(404).send({
          error: 'File not found',
          message: 'The requested image could not be found'
        });
      });
    });
  });
  
  // Add a dedicated endpoint for checking image availability
  app.get('/api/image-check/:filename', (req, res) => {
    const fileName = req.params.filename;
    const standardPath = path.join(uploadDir, fileName);
    const persistentPath = path.join(persistentUploadsDir, fileName);
    
    const standardExists = fs.existsSync(standardPath);
    const persistentExists = fs.existsSync(persistentPath);
    
    res.json({
      filename: fileName,
      exists: standardExists || persistentExists,
      location: standardExists ? 'standard' : (persistentExists ? 'persistent' : 'none')
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
