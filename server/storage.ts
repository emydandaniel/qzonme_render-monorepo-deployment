import { 
  users, type User, type InsertUser,
  quizzes, type Quiz, type InsertQuiz,
  questions, type Question, type InsertQuestion,
  quizAttempts, type QuizAttempt, type InsertQuizAttempt
} from "@shared/schema";
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
    return this.quizzes.get(id);
  }
  
  async getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined> {
    return Array.from(this.quizzes.values()).find(
      (quiz) => quiz.accessCode === accessCode
    );
  }
  
  async getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined> {
    return Array.from(this.quizzes.values()).find(
      (quiz) => quiz.urlSlug.toLowerCase() === urlSlug.toLowerCase()
    );
  }
  
  async getQuizByDashboardToken(token: string): Promise<Quiz | undefined> {
    return Array.from(this.quizzes.values()).find(
      (quiz) => quiz.dashboardToken === token
    );
  }
  
  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = this.quizId++;
    const createdAt = new Date();
    
    // Critical bug fix: Explicitly check quiz inputs for fresh data
    if (!insertQuiz.creatorName || !insertQuiz.creatorName.trim()) {
      console.error("SERVER ERROR: Empty creator name received");
      throw new Error("Creator name is required");
    }
    
    // Log the creator name from the browser
    console.log(`[SERVER] Received quiz creation with creator name: "${insertQuiz.creatorName}"`);
    
    // ALWAYS use the provided values and never use defaults to prevent bugs
    if (!insertQuiz.accessCode || !insertQuiz.urlSlug || !insertQuiz.dashboardToken) {
      console.error("Required quiz fields missing", { 
        hasAccessCode: !!insertQuiz.accessCode, 
        hasUrlSlug: !!insertQuiz.urlSlug,
        hasDashboardToken: !!insertQuiz.dashboardToken
      });
      throw new Error("Required quiz fields are missing");
    }
    
    // Use exactly what's provided from the client for explicit control
    const quiz: Quiz = { 
      id, 
      ...insertQuiz,
      // Ensure these are exactly as received from the client
      creatorName: insertQuiz.creatorName.trim(), 
      accessCode: insertQuiz.accessCode,
      urlSlug: insertQuiz.urlSlug,
      dashboardToken: insertQuiz.dashboardToken,
      createdAt
    };
    
    console.log(`[SERVER] Creating quiz with URL slug: "${quiz.urlSlug}"`);
    console.log(`[SERVER] Quiz slug derived from name: "${quiz.creatorName}"`);
    
    this.quizzes.set(id, quiz);
    return quiz;
  }
  
  // Question methods
  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    // If quizId is -1, return all questions (special case for verification)
    // This prevents errors when searching for individual questions by ID
    if (quizId === -1) {
      return Array.from(this.questions.values());
    }
    
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
  
  // Check if a quiz is expired (older than 30 days)
  isQuizExpired(quiz: Quiz): boolean {
    if (!quiz || !quiz.createdAt) return true;
    
    const now = new Date();
    const createdAt = new Date(quiz.createdAt);
    const diffInMs = now.getTime() - createdAt.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    return diffInDays > 30;
  }
}

export const storage = new MemStorage();
