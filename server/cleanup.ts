import { db } from './db';
import { quizzes, questions, quizAttempts } from '@shared/schema';
import { cleanupOldQuizImages, deleteImagesByQuizId } from './cloudinary';
import { log } from './vite';
import { eq, lt } from 'drizzle-orm';

// Retention period in milliseconds (7 days)
const RETENTION_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Gets the cutoff date for quiz retention
 * @returns Date object for the cutoff (7 days ago)
 */
function getRetentionCutoffDate(): Date {
  const cutoffDate = new Date();
  cutoffDate.setTime(cutoffDate.getTime() - RETENTION_PERIOD_MS);
  return cutoffDate;
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
  const cutoffDate = getRetentionCutoffDate();
  
  log(`Starting cleanup of quizzes older than ${cutoffDate.toISOString()}`);
  
  try {
    // Find quizzes older than retention period
    const oldQuizzes = await db
      .select({ id: quizzes.id, createdAt: quizzes.createdAt })
      .from(quizzes)
      .where(lt(quizzes.createdAt, cutoffDate));
    
    if (oldQuizzes.length === 0) {
      log('No expired quizzes found for cleanup');
      return { success: true, count: 0 };
    }
    
    log(`Found ${oldQuizzes.length} expired quizzes to clean up`);
    const oldQuizIds = oldQuizzes.map(quiz => quiz.id);
    
    // Delete from Cloudinary first
    await cleanupOldQuizImages(oldQuizIds);
    
    // Then delete from database
    for (const quizId of oldQuizIds) {
      // Delete quiz attempts
      await db.delete(quizAttempts).where(eq(quizAttempts.quizId, quizId));
      
      // Delete questions
      await db.delete(questions).where(eq(questions.quizId, quizId));
      
      // Delete quiz
      await db.delete(quizzes).where(eq(quizzes.id, quizId));
      
      log(`Deleted quiz ${quizId} and all related data`);
    }
    
    return {
      success: true,
      count: oldQuizzes.length,
      message: `Successfully cleaned up ${oldQuizzes.length} expired quizzes`
    };
  } catch (error) {
    log(`Error during quiz cleanup: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to clean up expired quizzes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Schedule the cleanup task to run daily
 * @param initialDelay Initial delay in milliseconds before first run
 * @returns The interval ID
 */
export function scheduleCleanupTask(initialDelay: number = 0) {
  // Run once after initialDelay
  if (initialDelay > 0) {
    setTimeout(() => {
      cleanupExpiredQuizzes().catch(err => {
        log(`Scheduled cleanup task failed: ${err.message}`);
      });
    }, initialDelay);
  }
  
  // Schedule to run daily
  const DAILY_MS = 24 * 60 * 60 * 1000;
  const intervalId = setInterval(() => {
    cleanupExpiredQuizzes().catch(err => {
      log(`Scheduled cleanup task failed: ${err.message}`);
    });
  }, DAILY_MS);
  
  log('Cleanup task scheduled to run daily');
  return intervalId;
}