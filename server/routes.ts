import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertQuizSchema, 
  insertQuestionSchema, 
  insertQuizAttemptSchema,
  questionAnswerSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Setup dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup multer for image uploads
const uploadDir = path.join(__dirname, "../uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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
  // Google Search Console verification file route
  app.get("/googleed3b604ceb8d883e.html", (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send('google-site-verification: googleed3b604ceb8d883e.html');
  });
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
      // Get all quizzes from the storage
      const allQuizzes = Array.from(storage["quizzes"].values());
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
      
      // Check if quiz is expired
      const isExpired = await storage.isQuizExpired(quiz.id);
      if (isExpired) {
        return res.status(404).json({ message: "Quiz has expired", expired: true });
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
        const allQuizzes = Array.from(storage["quizzes"].values());
        const slugMatch = allQuizzes.find(q => 
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
      
      // Check if quiz is expired
      const isExpired = await storage.isQuizExpired(quiz.id);
      if (isExpired) {
        return res.status(404).json({ message: "Quiz has expired", expired: true });
      }
      
      res.json(quiz);
    } catch (error) {
      console.error(`Error fetching quiz by slug "${req.params.urlSlug}":`, error);
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
      
      // Check if quiz is expired
      const isExpired = await storage.isQuizExpired(quizId);
      if (isExpired) {
        return res.status(404).json({ message: "Quiz has expired", expired: true });
      }
      
      console.log(`GET /api/quizzes/${quizId} response:`, quiz);
      res.json(quiz);
    } catch (error) {
      console.error(`Error fetching quiz ${req.params.quizId}:`, error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });
  
  // Get quizzes created by a user
  app.get("/api/users/:userId/quizzes", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const quizzes = await storage.getUserQuizzes(userId);
      
      // Filter out expired quizzes
      const now = new Date();
      const activeQuizzes = quizzes.filter(quiz => !quiz.expiresAt || quiz.expiresAt > now);
      
      res.json(activeQuizzes);
    } catch (error) {
      console.error(`Error fetching quizzes for user ${req.params.userId}:`, error);
      res.status(500).json({ message: "Failed to fetch user quizzes" });
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
      const quizId = parseInt(req.params.quizId);
      
      if (isNaN(quizId)) {
        return res.status(400).json({ message: "Invalid quiz ID" });
      }
      
      const attempts = await storage.getQuizAttempts(quizId);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });
  
  // Get specific quiz attempt by ID
  app.get("/api/quiz-attempts/:attemptId", async (req, res) => {
    try {
      const attemptId = parseInt(req.params.attemptId);
      
      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "Invalid attempt ID" });
      }
      
      // Find the attempt in all attempts
      const allAttempts = Array.from(storage["quizAttempts"].values());
      const attempt = allAttempts.find(a => a.id === attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Quiz attempt not found" });
      }
      
      console.log(`GET /api/quiz-attempts/${attemptId} response:`, attempt);
      res.json(attempt);
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
      
      const questions = Array.from(storage["questions"].values());
      const question = questions.find(q => q.id === questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      let isCorrect = false;
      const correctAnswers = question.correctAnswers as string[];
      
      if (Array.isArray(answerData.answer)) {
        // For multiple answers, check if all are correct
        isCorrect = answerData.answer.every(ans => 
          correctAnswers.some(correct => correct.toLowerCase() === ans.toLowerCase())
        );
      } else {
        // For single answer, check if it matches any correct answer
        isCorrect = correctAnswers.some(
          correct => correct.toLowerCase() === answerData.answer.toString().toLowerCase()
        );
      }
      
      res.json({ isCorrect });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid answer data", error: (error as z.ZodError).message });
      } else {
        res.status(500).json({ message: "Failed to verify answer" });
      }
    }
  });
  
  // Image upload endpoint
  app.post("/api/upload-image", upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the file path that can be used to retrieve the image
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.status(201).json({ 
        imageUrl: fileUrl,
        message: "Image uploaded successfully" 
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });
  
  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadDir, path.basename(req.path));
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.status(404).send('File not found');
      } else {
        next();
      }
    });
  }, (req, res) => {
    const filePath = path.join(uploadDir, path.basename(req.path));
    res.sendFile(filePath);
  });

  const httpServer = createServer(app);
  return httpServer;
}
