import { 
  users, type User, type InsertUser,
  quizzes, type Quiz, type InsertQuiz,
  questions, type Question, type InsertQuestion,
  quizAttempts, type QuizAttempt, type InsertQuizAttempt
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quiz operations
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined>;
  getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined>;
  getQuizByDashboardToken(token: string): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  
  // Question operations
  getQuestionsByQuizId(quizId: number): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Quiz Attempt operations
  getQuizAttempts(quizId: number): Promise<QuizAttempt[]>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  
  // Quiz expiration check
  isQuizExpired(quiz: Quiz): boolean;
}

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    // Validate the username is not empty
    if (!insertUser.username || !insertUser.username.trim()) {
      throw new Error("Username is required");
    }
    
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Quiz methods
  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }
  
  async getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined> {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.accessCode, accessCode));
    return quiz;
  }
  
  async getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined> {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.urlSlug, urlSlug));
    return quiz;
  }
  
  async getQuizByDashboardToken(token: string): Promise<Quiz | undefined> {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.dashboardToken, token));
    return quiz;
  }
  
  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    // Validate required fields
    if (!insertQuiz.creatorName || !insertQuiz.creatorName.trim()) {
      console.error("Empty creator name received");
      throw new Error("Creator name is required");
    }
    
    if (!insertQuiz.accessCode || !insertQuiz.urlSlug || !insertQuiz.dashboardToken) {
      console.error("Required quiz fields missing", { 
        hasAccessCode: !!insertQuiz.accessCode, 
        hasUrlSlug: !!insertQuiz.urlSlug,
        hasDashboardToken: !!insertQuiz.dashboardToken
      });
      throw new Error("Required quiz fields are missing");
    }
    
    console.log(`Creating quiz with creator: "${insertQuiz.creatorName}", slug: "${insertQuiz.urlSlug}"`);
    
    // Create the quiz
    const [quiz] = await db
      .insert(quizzes)
      .values(insertQuiz)
      .returning();
    
    return quiz;
  }
  
  // Question methods
  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId))
      .orderBy(questions.order);
    
    return result;
  }
  
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questions)
      .values(insertQuestion)
      .returning();
    
    return question;
  }
  
  // Quiz Attempt methods
  async getQuizAttempts(quizId: number): Promise<QuizAttempt[]> {
    const result = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId))
      .orderBy(quizAttempts.score);
    
    return result.reverse(); // Reverse to get highest scores first
  }
  
  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [attempt] = await db
      .insert(quizAttempts)
      .values(insertAttempt)
      .returning();
    
    return attempt;
  }
  
  // Check if a quiz is expired (older than 7 days)
  isQuizExpired(quiz: Quiz): boolean {
    if (!quiz || !quiz.createdAt) return true;
    
    const now = new Date();
    const createdAt = new Date(quiz.createdAt);
    const diffInMs = now.getTime() - createdAt.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    // Changed from 30 days to 7 days expiration policy
    return diffInDays > 7;
  }
}

// Create and export an instance of DatabaseStorage
export const storage = new DatabaseStorage();
