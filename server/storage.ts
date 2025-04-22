import { 
  users, type User, type InsertUser,
  quizzes, type Quiz, type InsertQuiz,
  questions, type Question, type InsertQuestion,
  quizAttempts, type QuizAttempt, type InsertQuizAttempt
} from "@shared/schema";
import { db } from "./db";
import { eq, lt, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quiz operations
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined>;
  getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  isQuizExpired(quiz: Quiz): boolean;
  cleanupExpiredQuizzes(): Promise<void>;
  
  // Question operations
  getQuestionsByQuizId(quizId: number): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Quiz Attempt operations
  getQuizAttempts(quizId: number): Promise<QuizAttempt[]>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private quizzes: Map<number, Quiz>;
  private questions: Map<number, Question>;
  private quizAttempts: Map<number, QuizAttempt>;
  
  private userId: number;
  private quizId: number;
  private questionId: number;
  private attemptId: number;
  
  constructor() {
    this.users = new Map();
    this.quizzes = new Map();
    this.questions = new Map();
    this.quizAttempts = new Map();
    
    this.userId = 1;
    this.quizId = 1;
    this.questionId = 1;
    this.attemptId = 1;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { id, ...insertUser };
    this.users.set(id, user);
    return user;
  }
  
  // Quiz methods
  async getQuiz(id: number): Promise<Quiz | undefined> {
    const quiz = this.quizzes.get(id);
    if (quiz && this.isQuizExpired(quiz)) {
      await this.cleanupExpiredQuizzes();
      return undefined;
    }
    return quiz;
  }
  
  async getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined> {
    const quiz = Array.from(this.quizzes.values()).find(
      (quiz) => quiz.accessCode === accessCode
    );
    if (quiz && this.isQuizExpired(quiz)) {
      await this.cleanupExpiredQuizzes();
      return undefined;
    }
    return quiz;
  }
  
  async getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined> {
    const quiz = Array.from(this.quizzes.values()).find(
      (quiz) => quiz.urlSlug.toLowerCase() === urlSlug.toLowerCase()
    );
    if (quiz && this.isQuizExpired(quiz)) {
      await this.cleanupExpiredQuizzes();
      return undefined;
    }
    return quiz;
  }
  
  isQuizExpired(quiz: Quiz): boolean {
    const expirationDays = 30;
    const now = new Date();
    const expirationDate = new Date(quiz.createdAt);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return now > expirationDate;
  }
  
  async cleanupExpiredQuizzes(): Promise<void> {
    const now = new Date();
    Array.from(this.quizzes.entries()).forEach(([id, quiz]) => {
      if (this.isQuizExpired(quiz)) {
        // Delete the quiz
        this.quizzes.delete(id);
        
        // Delete related questions
        const quizQuestions = Array.from(this.questions.entries())
          .filter(([_, question]) => question.quizId === id);
        quizQuestions.forEach(([questionId, _]) => {
          this.questions.delete(questionId);
        });
        
        // Delete related attempts
        const quizAttempts = Array.from(this.quizAttempts.entries())
          .filter(([_, attempt]) => attempt.quizId === id);
        quizAttempts.forEach(([attemptId, _]) => {
          this.quizAttempts.delete(attemptId);
        });
        
        console.log(`Quiz id ${id} expired after 30 days and was deleted.`);
      }
    });
  }
  
  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = this.quizId++;
    const createdAt = new Date();
    
    // Generate a unique access code if not provided
    const accessCode = insertQuiz.accessCode || nanoid(8);
    
    // Generate a URL slug based on creator name
    const urlSlug = insertQuiz.urlSlug || `${insertQuiz.creatorName.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;
    
    const quiz: Quiz = { 
      id, 
      ...insertQuiz,
      accessCode,
      urlSlug,
      createdAt
    };
    
    this.quizzes.set(id, quiz);
    return quiz;
  }
  
  // Question methods
  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter(question => question.quizId === quizId)
      .sort((a, b) => a.order - b.order);
  }
  
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    const question: Question = { 
      id, 
      ...insertQuestion,
      hint: insertQuestion.hint || null,
      imageUrl: insertQuestion.imageUrl || null
    };
    this.questions.set(id, question);
    return question;
  }
  
  // Quiz Attempt methods
  async getQuizAttempts(quizId: number): Promise<QuizAttempt[]> {
    return Array.from(this.quizAttempts.values())
      .filter(attempt => attempt.quizId === quizId)
      .sort((a, b) => b.score - a.score);
  }
  
  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const id = this.attemptId++;
    const completedAt = new Date();
    
    const attempt: QuizAttempt = { 
      id, 
      ...insertAttempt,
      completedAt
    };
    
    this.quizAttempts.set(id, attempt);
    return attempt;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize database and run cleanup on startup
    this.cleanupExpiredQuizzes(); 
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Quiz methods
  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    
    if (quiz && this.isQuizExpired(quiz)) {
      await this.cleanupExpiredQuizzes();
      return undefined;
    }
    
    return quiz || undefined;
  }
  
  async getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select()
      .from(quizzes)
      .where(eq(quizzes.accessCode, accessCode));
    
    if (quiz && this.isQuizExpired(quiz)) {
      await this.cleanupExpiredQuizzes();
      return undefined;
    }
    
    return quiz || undefined;
  }
  
  async getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined> {
    // Try an exact match first
    let [quiz] = await db.select()
      .from(quizzes)
      .where(eq(quizzes.urlSlug, urlSlug));
    
    // If no match, try case-insensitive comparison
    if (!quiz) {
      const allQuizzes = await db.select().from(quizzes);
      quiz = allQuizzes.find(q => q.urlSlug.toLowerCase() === urlSlug.toLowerCase());
    }
    
    if (quiz && this.isQuizExpired(quiz)) {
      await this.cleanupExpiredQuizzes();
      return undefined;
    }
    
    return quiz || undefined;
  }
  
  isQuizExpired(quiz: Quiz): boolean {
    const expirationDays = 30;
    const now = new Date();
    const expirationDate = new Date(quiz.createdAt);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return now > expirationDate;
  }
  
  async cleanupExpiredQuizzes(): Promise<void> {
    try {
      const expirationDays = 30;
      const now = new Date();
      // Calculate the date 30 days ago
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() - expirationDays);
      
      // Get all expired quizzes
      const expiredQuizzes = await db.select()
        .from(quizzes)
        .where(lt(quizzes.createdAt, expirationDate));
      
      for (const quiz of expiredQuizzes) {
        // Get related questions
        const quizQuestions = await db.select()
          .from(questions)
          .where(eq(questions.quizId, quiz.id));
          
        // Get related attempts
        const quizAttempts = await db.select()
          .from(quizAttempts)
          .where(eq(quizAttempts.quizId, quiz.id));
          
        // Delete attempts
        if (quizAttempts.length > 0) {
          await db.delete(quizAttempts)
            .where(eq(quizAttempts.quizId, quiz.id));
        }
        
        // Delete questions
        if (quizQuestions.length > 0) {
          await db.delete(questions)
            .where(eq(questions.quizId, quiz.id));
        }
        
        // Delete the quiz
        await db.delete(quizzes)
          .where(eq(quizzes.id, quiz.id));
          
        console.log(`Quiz id ${quiz.id} expired after 30 days and was deleted.`);
      }
    } catch (error) {
      console.error("Error cleaning up expired quizzes:", error);
    }
  }
  
  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    // Generate a unique access code if not provided
    const accessCode = insertQuiz.accessCode || nanoid(8);
    
    // Generate a URL slug based on creator name
    const urlSlug = insertQuiz.urlSlug || 
      `${insertQuiz.creatorName.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;
    
    const [quiz] = await db.insert(quizzes)
      .values({
        ...insertQuiz,
        accessCode,
        urlSlug,
      })
      .returning();
      
    return quiz;
  }
  
  // Question methods
  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    const quizQuestions = await db.select()
      .from(questions)
      .where(eq(questions.quizId, quizId))
      .orderBy(questions.order);
      
    return quizQuestions;
  }
  
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions)
      .values({
        ...insertQuestion,
        hint: insertQuestion.hint || null,
        imageUrl: insertQuestion.imageUrl || null
      })
      .returning();
      
    return question;
  }
  
  // Quiz Attempt methods
  async getQuizAttempts(quizId: number): Promise<QuizAttempt[]> {
    const attempts = await db.select()
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId))
      .orderBy(desc(quizAttempts.score));
      
    return attempts;
  }
  
  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [attempt] = await db.insert(quizAttempts)
      .values(insertAttempt)
      .returning();
      
    return attempt;
  }
}

// Initialize database storage
export const storage = new DatabaseStorage();
