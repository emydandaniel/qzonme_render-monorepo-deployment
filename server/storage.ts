import { 
  users, type User, type InsertUser,
  quizzes, type Quiz, type InsertQuiz,
  questions, type Question, type InsertQuestion,
  quizAttempts as quizAttemptsTable, type QuizAttempt, type InsertQuizAttempt
} from "@shared/schema";
import { db, isDbAvailable } from "./db";
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
    // Case-insensitive search for URL slug
    console.log(`Searching for quiz with URL slug: "${urlSlug}" (case-insensitive)`);
    
    // We need to be careful with case handling in slugs to ensure uniqueness
    const quiz = Array.from(this.quizzes.values()).find(
      (quiz) => quiz.urlSlug.toLowerCase() === urlSlug.toLowerCase()
    );
    
    if (quiz) {
      console.log(`Found quiz with URL slug: ${quiz.urlSlug}, created by: ${quiz.creatorName}`);
      
      // Check if the quiz has expired
      if (this.isQuizExpired(quiz)) {
        console.log(`Quiz found but it has expired: ${quiz.urlSlug}`);
        await this.cleanupExpiredQuizzes();
        return undefined;
      }
      
      return quiz;
    }
    
    console.log(`No quiz found with URL slug: "${urlSlug}"`);
    return undefined;
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
  private readonly isDbConnected: boolean;
  
  constructor() {
    this.isDbConnected = isDbAvailable && db !== null;
    // Initialize database and run cleanup on startup only if DB is connected
    if (this.isDbConnected) {
      this.cleanupExpiredQuizzes();
    } else {
      console.warn("Database not connected. Some operations may fail.");
    }
  }
  
  // Create a fallback instance for when DB is not available
  private fallbackStorage = new MemStorage();
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.getUser(id);
    }
    
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error("Database error in getUser:", error);
      return this.fallbackStorage.getUser(id);
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.createUser(insertUser);
    }
    
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Database error in createUser:", error);
      return this.fallbackStorage.createUser(insertUser);
    }
  }
  
  // Quiz methods
  async getQuiz(id: number): Promise<Quiz | undefined> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.getQuiz(id);
    }
    
    try {
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
      
      if (quiz && this.isQuizExpired(quiz)) {
        await this.cleanupExpiredQuizzes();
        return undefined;
      }
      
      return quiz || undefined;
    } catch (error) {
      console.error("Database error in getQuiz:", error);
      return this.fallbackStorage.getQuiz(id);
    }
  }
  
  async getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.getQuizByAccessCode(accessCode);
    }
    
    try {
      const [quiz] = await db.select()
        .from(quizzes)
        .where(eq(quizzes.accessCode, accessCode));
      
      if (quiz && this.isQuizExpired(quiz)) {
        await this.cleanupExpiredQuizzes();
        return undefined;
      }
      
      return quiz || undefined;
    } catch (error) {
      console.error("Database error in getQuizByAccessCode:", error);
      return this.fallbackStorage.getQuizByAccessCode(accessCode);
    }
  }
  
  async getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.getQuizByUrlSlug(urlSlug);
    }
    
    try {
      console.log(`[DB] Searching for quiz with URL slug: "${urlSlug}"`);
      
      // Try an exact match first
      let [quiz] = await db.select()
        .from(quizzes)
        .where(eq(quizzes.urlSlug, urlSlug));
      
      // If no match, try progressive matching strategies
      if (!quiz) {
        console.log(`[DB] No exact match found, trying alternative matches for: "${urlSlug}"`);
        
        const allQuizzes = await db.select().from(quizzes);
        
        // Strategy 1: Case-insensitive exact match
        let matchedQuiz = allQuizzes.find((q: Quiz) => 
          q.urlSlug.toLowerCase() === urlSlug.toLowerCase()
        );
        
        // Strategy 2: If still no match, check if the passed slug is a prefix of a real slug
        // This helps with truncated URLs
        if (!matchedQuiz && urlSlug.length >= 6) {
          matchedQuiz = allQuizzes.find((q: Quiz) => 
            q.urlSlug.toLowerCase().startsWith(urlSlug.toLowerCase())
          );
          
          if (matchedQuiz) {
            console.log(`[DB] Found quiz with prefix match: ${matchedQuiz.urlSlug}`);
          }
        }
        
        // Strategy 3: Check if the slug prefix before '-' matches
        // For URLs like "daniel-tkgx" that should match "daniel-1234abcd"
        if (!matchedQuiz && urlSlug.includes('-')) {
          const slugPrefix = urlSlug.split('-')[0].toLowerCase();
          const matchingQuizzes = allQuizzes.filter((q: Quiz) => 
            q.urlSlug.toLowerCase().startsWith(slugPrefix + '-')
          );
          
          // If we got a match, use the most recent one
          if (matchingQuizzes.length > 0) {
            // Sort by creation date (newest first)
            matchingQuizzes.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            matchedQuiz = matchingQuizzes[0];
            console.log(`[DB] Found quiz with creator name match: ${matchedQuiz.urlSlug}`);
          }
        }
        
        if (matchedQuiz) {
          quiz = matchedQuiz;
        } else {
          console.log(`[DB] No quiz found with URL slug (case-insensitive): "${urlSlug}"`);
        }
      } else {
        console.log(`[DB] Found quiz with exact match: ${quiz.urlSlug}`);
      }
      
      if (quiz && this.isQuizExpired(quiz)) {
        console.log(`[DB] Quiz found but it has expired: ${quiz.urlSlug}`);
        await this.cleanupExpiredQuizzes();
        return undefined;
      }
      
      if (quiz) {
        console.log(`[DB] Returning quiz with URL slug: ${quiz.urlSlug}, created by: ${quiz.creatorName}`);
      } else {
        console.log(`[DB] No quiz found with URL slug (case-insensitive): "${urlSlug}"`);
      }
      
      return quiz;
    } catch (error) {
      console.error("[DB] Database error in getQuizByUrlSlug:", error);
      return this.fallbackStorage.getQuizByUrlSlug(urlSlug);
    }
  }
  
  isQuizExpired(quiz: Quiz): boolean {
    const expirationDays = 30;
    const now = new Date();
    const expirationDate = new Date(quiz.createdAt);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return now > expirationDate;
  }
  
  async cleanupExpiredQuizzes(): Promise<void> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.cleanupExpiredQuizzes();
    }
    
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
        const attemptsList = await db.select()
          .from(quizAttemptsTable)
          .where(eq(quizAttemptsTable.quizId, quiz.id));
          
        // Delete attempts
        if (attemptsList.length > 0) {
          await db.delete(quizAttemptsTable)
            .where(eq(quizAttemptsTable.quizId, quiz.id));
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
      return this.fallbackStorage.cleanupExpiredQuizzes();
    }
  }
  
  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.createQuiz(insertQuiz);
    }
    
    try {
      // Generate a unique access code if not provided
      const accessCode = insertQuiz.accessCode || nanoid(8);
      
      // Start with the provided URL slug or generate one based on creator name
      let urlSlug = insertQuiz.urlSlug || 
        `${insertQuiz.creatorName.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(16)}${nanoid(6)}`;
      
      // Check if the URL slug already exists
      const existingQuiz = await this.getQuizByUrlSlug(urlSlug);
      
      // If it exists, generate a new unique slug
      if (existingQuiz) {
        console.log(`[DB] URL slug collision detected: ${urlSlug}`);
        
        // Add timestamp and more random characters to make it unique
        const timestamp = Date.now().toString(16);
        const extraRandomness = nanoid(8); // Use nanoid for better randomness
        urlSlug = `${urlSlug}-${timestamp}${extraRandomness.substring(0, 4)}`;
        
        console.log(`[DB] Generated new unique URL slug: ${urlSlug}`);
      }
      
      // Now insert with the verified unique slug
      const [quiz] = await db.insert(quizzes)
        .values({
          ...insertQuiz,
          accessCode,
          urlSlug,
        })
        .returning();
      
      console.log(`[DB] Successfully created quiz id ${quiz.id} with URL slug ${quiz.urlSlug}`);
      return quiz;
    } catch (error) {
      console.error("[DB] Database error in createQuiz:", error);
      return this.fallbackStorage.createQuiz(insertQuiz);
    }
  }
  
  // Question methods
  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.getQuestionsByQuizId(quizId);
    }
    
    try {
      const quizQuestions = await db.select()
        .from(questions)
        .where(eq(questions.quizId, quizId))
        .orderBy(questions.order);
        
      return quizQuestions;
    } catch (error) {
      console.error("Database error in getQuestionsByQuizId:", error);
      return this.fallbackStorage.getQuestionsByQuizId(quizId);
    }
  }
  
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.createQuestion(insertQuestion);
    }
    
    try {
      const [question] = await db.insert(questions)
        .values({
          ...insertQuestion,
          hint: insertQuestion.hint || null,
          imageUrl: insertQuestion.imageUrl || null
        })
        .returning();
        
      return question;
    } catch (error) {
      console.error("Database error in createQuestion:", error);
      return this.fallbackStorage.createQuestion(insertQuestion);
    }
  }
  
  // Quiz Attempt methods
  async getQuizAttempts(quizId: number): Promise<QuizAttempt[]> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.getQuizAttempts(quizId);
    }
    
    try {
      const attempts = await db.select()
        .from(quizAttemptsTable)
        .where(eq(quizAttemptsTable.quizId, quizId))
        .orderBy(desc(quizAttemptsTable.score));
        
      return attempts;
    } catch (error) {
      console.error("Database error in getQuizAttempts:", error);
      return this.fallbackStorage.getQuizAttempts(quizId);
    }
  }
  
  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    if (!this.isDbConnected) {
      return this.fallbackStorage.createQuizAttempt(insertAttempt);
    }
    
    try {
      const [attempt] = await db.insert(quizAttemptsTable)
        .values(insertAttempt)
        .returning();
        
      return attempt;
    } catch (error) {
      console.error("Database error in createQuizAttempt:", error);
      return this.fallbackStorage.createQuizAttempt(insertAttempt);
    }
  }
}

// Initialize the appropriate storage based on database availability
let storageInstance: IStorage;

if (isDbAvailable && db) {
  console.log("Using persistent database storage");
  storageInstance = new DatabaseStorage();
} else {
  console.log("Using in-memory storage");
  storageInstance = new MemStorage();
}

export const storage: IStorage = storageInstance;
