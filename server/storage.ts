import { 
  users, type User, type InsertUser,
  quizzes, type Quiz, type InsertQuiz,
  questions, type Question, type InsertQuestion,
  quizAttempts, type QuizAttempt, type InsertQuizAttempt
} from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";

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
  
  // Question operations
  getQuestionsByQuizId(quizId: number): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Quiz Attempt operations
  getQuizAttempts(quizId: number): Promise<QuizAttempt[]>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
}

// PostgreSQL database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz || undefined;
  }

  async getQuizByAccessCode(accessCode: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.accessCode, accessCode));
    return quiz || undefined;
  }

  async getQuizByUrlSlug(urlSlug: string): Promise<Quiz | undefined> {
    // Case-insensitive search by converting both to lowercase
    const allQuizzes = await db.select().from(quizzes);
    return allQuizzes.find(quiz => 
      quiz.urlSlug.toLowerCase() === urlSlug.toLowerCase()
    );
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    // Generate a unique access code if not provided
    const accessCode = insertQuiz.accessCode || nanoid(8);
    
    // Generate a URL slug based on creator name
    const urlSlug = insertQuiz.urlSlug || `${insertQuiz.creatorName.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;
    
    const [quiz] = await db.insert(quizzes).values({
      ...insertQuiz,
      accessCode,
      urlSlug
    }).returning();
    
    return quiz;
  }

  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    return db.select().from(questions)
      .where(eq(questions.quizId, quizId))
      .orderBy(asc(questions.order));
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values({
      ...insertQuestion,
      hint: insertQuestion.hint || null,
      imageUrl: insertQuestion.imageUrl || null
    }).returning();
    
    return question;
  }

  async getQuizAttempts(quizId: number): Promise<QuizAttempt[]> {
    return db.select().from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId))
      .orderBy(desc(quizAttempts.score));
  }

  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [attempt] = await db.insert(quizAttempts).values(insertAttempt).returning();
    return attempt;
  }
}

// In-memory storage implementation (keeping for reference)
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

// Switch from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
