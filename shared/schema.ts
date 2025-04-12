import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
});

// Quiz schema
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name").notNull(),
  accessCode: text("access_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

// Question schema
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  text: text("text").notNull(),
  type: text("type").notNull(), // "multiple-choice" or "open-ended"
  options: jsonb("options"), // For multiple-choice: array of options
  correctAnswers: jsonb("correct_answers").notNull(), // Array of correct answers
  hint: text("hint"), // Optional hint for open-ended questions
  order: integer("order").notNull(), // Question order in the quiz
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

// QuizAttempt schema
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  userAnswerId: integer("user_answer_id").notNull(),
  userName: text("user_name").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answers: jsonb("answers").notNull(), // Array of answers with question IDs
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  completedAt: true,
});

// Question Answer schema for validation
export const questionAnswerSchema = z.object({
  questionId: z.number(),
  userAnswer: z.union([z.string(), z.array(z.string())]),
  isCorrect: z.boolean().optional(),
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;

export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;
