import { db } from './db';
import { quizzes, questions, quizAttempts } from '@shared/schema';
import { eq, lt, inArray, sql } from 'drizzle-orm';
import { cleanupOldQuizImages } from './cloudinary';

/**
 * Gets the cutoff date for quiz retention
 * @returns Date object for the cutoff (7 days ago)
 */
function getRetentionCutoffDate(): Date {
  const now = new Date();
  // Set cutoff to 7 days ago (changed from 30 days)
  now.setDate(now.getDate() - 7);
  return now;
}

/**
 * Cleans up expired quizzes and their related data
 * - Deletes quizzes older than 7 days
 * - Deletes associated questions
 * - Deletes associated attempts
 * - Deletes associated images from Cloudinary
 * @returns Promise resolving to cleanup results
 */
export async function cleanupExpiredQuizzes() {
  try {
    console.log('Starting cleanup of expired quizzes...');
    const cutoffDate = getRetentionCutoffDate();
    console.log(`Cutoff date for expired quizzes: ${cutoffDate.toISOString()}`);
    
    // First, get all expired quizzes (older than 7 days)
    const expiredQuizzes = await db
      .select()
      .from(quizzes)
      .where(lt(quizzes.createdAt, cutoffDate));
    
    console.log(`Found ${expiredQuizzes.length} expired quizzes to clean up`);
    
    if (expiredQuizzes.length === 0) {
      return { 
        success: true, 
        message: 'No expired quizzes found to clean up',
        count: 0 
      };
    }
    
    const expiredQuizIds = expiredQuizzes.map(quiz => quiz.id);
    
    // Clean up related images from Cloudinary
    try {
      console.log(`Cleaning up images for ${expiredQuizIds.length} expired quizzes...`);
      await cleanupOldQuizImages(expiredQuizIds);
    } catch (imageError) {
      console.error('Error cleaning up images:', imageError);
      // Continue with database cleanup even if image cleanup fails
    }
    
    // Delete associated attempts
    const attemptDeleteResult = await db
      .delete(quizAttempts)
      .where(
        expiredQuizIds.length === 1
          ? eq(quizAttempts.quizId, expiredQuizIds[0])
          : inArray(quizAttempts.quizId, expiredQuizIds)
      );
    
    console.log(`Deleted quiz attempts for expired quizzes`);
    
    // Delete associated questions
    const questionDeleteResult = await db
      .delete(questions)
      .where(
        expiredQuizIds.length === 1
          ? eq(questions.quizId, expiredQuizIds[0])
          : inArray(questions.quizId, expiredQuizIds)
      );
    
    console.log(`Deleted questions for expired quizzes`);
    
    // Finally, delete the expired quizzes
    const quizDeleteResult = await db
      .delete(quizzes)
      .where(
        expiredQuizIds.length === 1
          ? eq(quizzes.id, expiredQuizIds[0])
          : inArray(quizzes.id, expiredQuizIds)
      );
    
    console.log(`Deleted ${expiredQuizzes.length} expired quizzes`);
    
    return {
      success: true,
      message: `Cleaned up ${expiredQuizzes.length} expired quizzes`,
      count: expiredQuizzes.length,
      quizIds: expiredQuizIds
    };
  } catch (error) {
    console.error('Error cleaning up expired quizzes:', error);
    return {
      success: false,
      error: String(error),
      message: 'Failed to clean up expired quizzes'
    };
  }
}

/**
 * Schedule the cleanup task to run daily
 * @param initialDelay Initial delay in milliseconds before first run
 * @returns The interval ID
 */
export function scheduleCleanupTask(initialDelay: number = 0) {
  console.log(`Scheduling daily cleanup task (initial delay: ${initialDelay}ms)`);
  
  // Run the task immediately after the initial delay
  const initialTimeoutId = setTimeout(async () => {
    console.log('Running initial cleanup task...');
    try {
      const result = await cleanupExpiredQuizzes();
      console.log('Initial cleanup completed:', result);
    } catch (error) {
      console.error('Error in initial cleanup:', error);
    }
    
    // Then schedule it to run daily (24 hours = 86400000ms)
    const intervalId = setInterval(async () => {
      console.log('Running scheduled cleanup task...');
      try {
        const result = await cleanupExpiredQuizzes();
        console.log('Scheduled cleanup completed:', result);
      } catch (error) {
        console.error('Error in scheduled cleanup:', error);
      }
    }, 86400000); // 24 hours
    
    return intervalId;
  }, initialDelay);
  
  return initialTimeoutId;
}