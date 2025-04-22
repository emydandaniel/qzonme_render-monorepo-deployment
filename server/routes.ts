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
      
      // Check if the URL slug already exists to ensure uniqueness
      // This is a critical check to prevent overwriting existing quizzes
      const existingQuiz = await storage.getQuizByUrlSlug(quizData.urlSlug);
      
      if (existingQuiz) {
        console.log(`URL slug collision detected: ${quizData.urlSlug}`);
        
        // Generate a new unique URL slug by adding additional entropy
        const timestamp = Date.now().toString(36);
        const extraRandomness = Math.random().toString(36).substring(2, 6);
        quizData.urlSlug = `${quizData.urlSlug}-${timestamp}${extraRandomness}`;
        
        console.log(`Generated new unique URL slug: ${quizData.urlSlug}`);
      }
      
      // Now create the quiz with the verified unique slug
      const quiz = await storage.createQuiz(quizData);
      
      console.log(`Successfully created quiz with id ${quiz.id} and URL slug ${quiz.urlSlug}`);
      res.status(201).json(quiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quiz data", error: (error as z.ZodError).message });
      } else {
        console.error("Failed to create quiz:", error);
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
      console.log("Creating new quiz attempt with data:", req.body);
      const attemptData = insertQuizAttemptSchema.parse(req.body);
      
      const attempt = await storage.createQuizAttempt(attemptData);
      console.log("Successfully created quiz attempt:", attempt);
      
      res.status(201).json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Invalid quiz attempt data:", error.message);
        res.status(400).json({ message: "Invalid attempt data", error: error.message });
      } else {
        console.error("Failed to create quiz attempt:", error);
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
      
      // Get attempt using the proper storage interface method
      // We need to get all attempts for the quiz first, then find the specific one
      // Since we don't have a direct getAttemptById method in the interface
      const quizzes = await storage.getQuiz(1); // Just get any quiz to find all attempts
      if (!quizzes) {
        return res.status(404).json({ message: "No quizzes found" });
      }
      
      // Get all attempts and find the specific one
      const allAttempts = await Promise.all(
        [1, 2, 3, 4, 5].map(async (qid) => {
          try {
            const attempts = await storage.getQuizAttempts(qid);
            return attempts;
          } catch (err) {
            return [];
          }
        })
      );
      
      // Flatten the array of arrays
      const flattenedAttempts = allAttempts.flat();
      const attempt = flattenedAttempts.find(a => a.id === attemptId);
      
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
      
      // Find the quiz for this question first (we'll need to search through all quizzes)
      // This is a temporary solution until we add a getQuestionById method to the storage interface
      const allQuestions = await Promise.all(
        [1, 2, 3, 4, 5].map(async (qid) => {
          try {
            const questions = await storage.getQuestionsByQuizId(qid);
            return questions;
          } catch (err) {
            return [];
          }
        })
      );
      
      // Flatten and find the specific question
      const questions = allQuestions.flat();
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
      // Type check req.file
      if (!req.file || !req.file.filename) {
        return res.status(400).json({ message: "No file uploaded or invalid file" });
      }
      
      const filename = req.file.filename;
      
      // Ensure the file was saved correctly
      const filePath = path.join(uploadDir, filename);
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error("Failed to verify uploaded file:", err);
          return res.status(500).json({ message: "Failed to save uploaded file" });
        }
        
        // Return the file path that can be used to retrieve the image
        const fileUrl = `/uploads/${filename}`;
        
        console.log(`Image uploaded successfully: ${fileUrl}`);
        
        res.status(201).json({ 
          imageUrl: fileUrl,
          message: "Image uploaded successfully" 
        });
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });
  
  // Serve uploaded files - improved with better error handling
  app.use('/uploads', (req, res, next) => {
    // Get the filename from the request path and sanitize it
    const fileName = path.basename(req.path);
    if (!fileName || fileName.includes('..')) {
      return res.status(400).send('Invalid file path');
    }
    
    const filePath = path.join(uploadDir, fileName);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`File not found: ${filePath}`, err);
        return res.status(404).send('File not found');
      } else {
        next();
      }
    });
  }, (req, res) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(uploadDir, fileName);
    
    // Send the file with explicit content-type
    const ext = path.extname(fileName).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.gif' ? 'image/gif' :
      'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(filePath);
  });

  const httpServer = createServer(app);
  return httpServer;
}
