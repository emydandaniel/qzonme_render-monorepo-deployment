import { users, quizzes, questions, quizAttempts, autoCreateUsage } from "@shared/schema";

// Mock database for testing without real PostgreSQL
export const mockDb = {
  users: new Map(),
  quizzes: new Map(),
  questions: new Map(),
  quizAttempts: new Map(),
  autoCreateUsage: new Map(),
  
  // Counters for auto-incrementing IDs (like PostgreSQL serial)
  nextUserId: 1,
  nextQuizId: 1,
  nextQuestionId: 1,
  nextQuizAttemptId: 1,
  nextAutoCreateUsageId: 1,
  
  // Mock drizzle-like interface
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        limit: (num: number) => [],
        then: (callback: any) => Promise.resolve([])
      }),
      limit: (num: number) => ({
        then: (callback: any) => Promise.resolve([])
      }),
      then: (callback: any) => Promise.resolve([])
    })
  }),
  
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: () => {
        // Generate sequential IDs like PostgreSQL serial
        let id;
        if (table === users || (table.name && table.name === 'users')) {
          id = mockDb.nextUserId++;
          const record = { id, ...data };
          mockDb.users.set(id, record);
          return [record];
        } else if (table === quizzes || (table.name && table.name === 'quizzes')) {
          id = mockDb.nextQuizId++;
          const record = { id, ...data };
          mockDb.quizzes.set(id, record);
          return [record];
        } else if (table === questions || (table.name && table.name === 'questions')) {
          id = mockDb.nextQuestionId++;
          const record = { id, ...data };
          mockDb.questions.set(id, record);
          return [record];
        } else if (table === quizAttempts || (table.name && table.name === 'quiz_attempts')) {
          id = mockDb.nextQuizAttemptId++;
          const record = { id, ...data };
          mockDb.quizAttempts.set(id, record);
          return [record];
        } else if (table === autoCreateUsage || (table.name && table.name === 'auto_create_usage')) {
          id = mockDb.nextAutoCreateUsageId++;
          const record = { id, ...data };
          mockDb.autoCreateUsage.set(id, record);
          return [record];
        }
        
        // Fallback for unknown tables
        id = Date.now(); // Keep timestamp as fallback for unknown tables
        const record = { id, ...data };
        return [record];
      }
    })
  }),
  
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => ({
        returning: () => Promise.resolve([{ id: Date.now(), ...data }]),
        then: (callback: any) => Promise.resolve({ id: Date.now(), ...data })
      })
    })
  }),
  
  delete: (table: any) => ({
    where: (condition: any) => ({
      returning: () => Promise.resolve([]),
      then: (callback: any) => Promise.resolve(0)
    })
  })
};

// Mock the db export
export const db = mockDb;
export const pool = null;