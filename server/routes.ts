import type { Express } from "express";
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

  app.get("/api/quizzes/:accessCode", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
