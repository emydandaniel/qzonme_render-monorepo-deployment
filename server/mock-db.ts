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
        limit: (num: number) => {
          // Handle autoCreateUsage queries for rate limiting
          if (table === autoCreateUsage || (table.name && table.name === 'auto_create_usage')) {
            const today = new Date().toISOString().split('T')[0];
            const results = Array.from(mockDb.autoCreateUsage.values()).filter((record: any) => {
              // Check if record is for today
              const recordDate = record.date ? new Date(record.date).toISOString().split('T')[0] : today;
              return recordDate === today;
            });
            console.log(`📊 Mock DB: Found ${results.length} autoCreateUsage records for today`);
            return Promise.resolve(results.slice(0, num));
          }
          return Promise.resolve([]);
        },
        then: (callback: any) => {
          // Handle quiz lookups by dashboardToken, urlSlug, or ID
          if (table === quizzes || (table.name && table.name === 'quizzes')) {
            const results = Array.from(mockDb.quizzes.values()).filter((quiz: any) => {
              // More robust condition matching - the condition is actually an eq() function result
              // We need to check the actual values being compared
              if (condition && typeof condition === 'object') {
                // Handle different types of conditions
                if (condition.left && condition.right !== undefined) {
                  // Standard eq(field, value) condition
                  const field = condition.left;
                  const value = condition.right;
                  
                  if (field && field.name) {
                    return quiz[field.name] === value;
                  }
                }
                
                // Fallback: try to extract from condition structure
                const conditionStr = condition.toString();
                if (conditionStr.includes('dashboardToken') && condition.right) {
                  return quiz.dashboardToken === condition.right;
                }
                if (conditionStr.includes('urlSlug') && condition.right) {
                  return quiz.urlSlug === condition.right;
                }
                if (conditionStr.includes('id') && condition.right) {
                  return quiz.id === condition.right;
                }
              }
              return false;
            });
            console.log(`📊 Mock DB: Found ${results.length} quiz records matching condition`);
            return Promise.resolve(results);
          }
          
          // Handle autoCreateUsage queries for rate limiting
          if (table === autoCreateUsage || (table.name && table.name === 'auto_create_usage')) {
            const today = new Date().toISOString().split('T')[0];
            const results = Array.from(mockDb.autoCreateUsage.values()).filter((record: any) => {
              const recordDate = record.date ? new Date(record.date).toISOString().split('T')[0] : today;
              return recordDate === today;
            });
            console.log(`📊 Mock DB: Found ${results.length} autoCreateUsage records for today (no limit)`);
            return Promise.resolve(results);
          }
          
          // Handle questions by quizId
          if (table === questions || (table.name && table.name === 'questions')) {
            const results = Array.from(mockDb.questions.values()).filter((question: any) => {
              if (condition && typeof condition === 'object') {
                if (condition.left && condition.right !== undefined) {
                  const field = condition.left;
                  const value = condition.right;
                  
                  if (field && field.name) {
                    return question[field.name] === value;
                  }
                }
                
                // Fallback for quizId matching
                const conditionStr = condition.toString();
                if (conditionStr.includes('quizId') && condition.right) {
                  return question.quizId === condition.right;
                }
              }
              return false;
            });
            console.log(`📊 Mock DB: Found ${results.length} question records matching condition`);
            return Promise.resolve(results);
          }
          
          return Promise.resolve([]);
        }
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
          // Add createdAt timestamp to mimic PostgreSQL defaultNow()
          const record = { id, ...data, createdAt: new Date() };
          mockDb.quizzes.set(id, record);
          return [record];
        } else if (table === questions || (table.name && table.name === 'questions')) {
          id = mockDb.nextQuestionId++;
          const record = { id, ...data };
          mockDb.questions.set(id, record);
          return [record];
        } else if (table === quizAttempts || (table.name && table.name === 'quiz_attempts')) {
          id = mockDb.nextQuizAttemptId++;
          // Add completedAt timestamp to mimic PostgreSQL defaultNow()
          const record = { id, ...data, completedAt: new Date() };
          mockDb.quizAttempts.set(id, record);
          return [record];
        } else if (table === autoCreateUsage || (table.name && table.name === 'auto_create_usage')) {
          id = mockDb.nextAutoCreateUsageId++;
          const record = { 
            id, 
            ...data, 
            date: data.date || new Date().toISOString().split('T')[0],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          mockDb.autoCreateUsage.set(id, record);
          console.log(`📊 Mock DB: Created autoCreateUsage record:`, record);
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
      where: (condition: any) => {
        // Handle autoCreateUsage updates for rate limiting
        if (table === autoCreateUsage || (table.name && table.name === 'auto_create_usage')) {
          // Find and update the record for today
          const today = new Date().toISOString().split('T')[0];
          const entries = Array.from(mockDb.autoCreateUsage.entries());
          
          for (const [id, record] of entries) {
            const recordDate = record.date ? new Date(record.date).toISOString().split('T')[0] : today;
            if (recordDate === today) {
              const updatedRecord = { ...record, ...data, updatedAt: new Date() };
              mockDb.autoCreateUsage.set(id, updatedRecord);
              console.log(`📊 Mock DB: Updated autoCreateUsage record:`, updatedRecord);
              return Promise.resolve(updatedRecord);
            }
          }
          
          // If no record for today exists, create one
          const newId = mockDb.nextAutoCreateUsageId++;
          const newRecord = { 
            id: newId, 
            date: today,
            usageCount: data.usageCount || 1,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          mockDb.autoCreateUsage.set(newId, newRecord);
          console.log(`📊 Mock DB: Created new autoCreateUsage record:`, newRecord);
          return Promise.resolve(newRecord);
        }
        return Promise.resolve({ id: Date.now(), ...data });
      }
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