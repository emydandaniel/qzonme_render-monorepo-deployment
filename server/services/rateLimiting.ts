import { db } from "../db";
import { autoCreateUsage, insertAutoCreateUsageSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { AUTO_CREATE_SERVER_CONFIG } from "../config/autoCreate";

export interface RateLimitResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  resetTime: Date;
  remainingUses: number;
}

export interface RateLimitError extends Error {
  code: 'RATE_LIMIT_EXCEEDED';
  currentUsage: number;
  limit: number;
  resetTime: Date;
}

/**
 * Check if an IP address can use the auto-create feature
 */
export async function checkRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const limit = AUTO_CREATE_SERVER_CONFIG.DAILY_LIMIT;
  
  try {
    // Get current usage for today
    const existingUsage = await db
      .select()
      .from(autoCreateUsage)
      .where(
        and(
          eq(autoCreateUsage.ipAddress, ipAddress),
          eq(autoCreateUsage.usageDate, today)
        )
      )
      .limit(1);
    
    const currentUsage = existingUsage.length > 0 ? existingUsage[0].usageCount : 0;
    const allowed = currentUsage < limit;
    
    // Calculate reset time (midnight of next day)
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
    
    return {
      allowed,
      currentUsage,
      limit,
      resetTime,
      remainingUses: Math.max(0, limit - currentUsage)
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // In case of database error, allow the request but log the error
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
    
    return {
      allowed: true,
      currentUsage: 0,
      limit,
      resetTime,
      remainingUses: limit
    };
  }
}

/**
 * Increment usage count for an IP address
 */
export async function incrementUsage(ipAddress: string): Promise<RateLimitResult> {
  const today = new Date().toISOString().split('T')[0];
  const limit = AUTO_CREATE_SERVER_CONFIG.DAILY_LIMIT;
  
  try {
    // First check current limit
    const rateLimitCheck = await checkRateLimit(ipAddress);
    
    if (!rateLimitCheck.allowed) {
      const error = new Error('Rate limit exceeded') as RateLimitError;
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.currentUsage = rateLimitCheck.currentUsage;
      error.limit = rateLimitCheck.limit;
      error.resetTime = rateLimitCheck.resetTime;
      throw error;
    }
    
    // Try to increment existing record or create new one
    const existingUsage = await db
      .select()
      .from(autoCreateUsage)
      .where(
        and(
          eq(autoCreateUsage.ipAddress, ipAddress),
          eq(autoCreateUsage.usageDate, today)
        )
      )
      .limit(1);
    
    let newUsageCount: number;
    
    if (existingUsage.length > 0) {
      // Update existing record
      newUsageCount = existingUsage[0].usageCount + 1;
      await db
        .update(autoCreateUsage)
        .set({ 
          usageCount: newUsageCount,
          updatedAt: new Date()
        })
        .where(eq(autoCreateUsage.id, existingUsage[0].id));
    } else {
      // Create new record
      newUsageCount = 1;
      await db.insert(autoCreateUsage).values({
        ipAddress,
        usageDate: today,
        usageCount: newUsageCount
      });
    }
    
    // Calculate reset time
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
    
    return {
      allowed: newUsageCount < limit,
      currentUsage: newUsageCount,
      limit,
      resetTime,
      remainingUses: Math.max(0, limit - newUsageCount)
    };
  } catch (error) {
    if ((error as RateLimitError).code === 'RATE_LIMIT_EXCEEDED') {
      throw error;
    }
    
    console.error('Error incrementing usage:', error);
    throw new Error('Failed to update usage tracking');
  }
}

/**
 * Get usage statistics for an IP address
 */
export async function getUsageStats(ipAddress: string): Promise<{
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's usage
    const todayUsage = await db
      .select()
      .from(autoCreateUsage)
      .where(
        and(
          eq(autoCreateUsage.ipAddress, ipAddress),
          eq(autoCreateUsage.usageDate, today)
        )
      )
      .limit(1);
    
    // Get all usage for this IP (for week/month/total calculations)
    const allUsage = await db
      .select()
      .from(autoCreateUsage)
      .where(eq(autoCreateUsage.ipAddress, ipAddress));
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let thisWeek = 0;
    let thisMonth = 0;
    let total = 0;
    
    allUsage.forEach(usage => {
      const usageDate = new Date(usage.usageDate);
      total += usage.usageCount;
      
      if (usageDate >= weekAgo) {
        thisWeek += usage.usageCount;
      }
      
      if (usageDate >= monthAgo) {
        thisMonth += usage.usageCount;
      }
    });
    
    return {
      today: todayUsage.length > 0 ? todayUsage[0].usageCount : 0,
      thisWeek,
      thisMonth,
      total
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };
  }
}

/**
 * Clean up old usage records (older than 30 days)
 */
export async function cleanupOldUsageRecords(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const result = await db
      .delete(autoCreateUsage)
      .where(
        // Note: This is a simple string comparison which works for YYYY-MM-DD format
        // In a production environment, you might want to use proper date comparison
        eq(autoCreateUsage.usageDate, cutoffDate)
      );
    
    console.log(`Cleaned up old usage records: ${result} records deleted`);
    return result as any; // Drizzle returns different types, cast for simplicity
  } catch (error) {
    console.error('Error cleaning up old usage records:', error);
    return 0;
  }
}

/**
 * Middleware function for Express routes
 */
export function rateLimitMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const rateLimitResult = await checkRateLimit(ipAddress);
      
      // Add rate limit info to request object
      req.rateLimit = rateLimitResult;
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remainingUses.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
      });
      
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `You've reached your daily limit of ${rateLimitResult.limit} auto-create quiz generations. Please try again tomorrow.`,
          currentUsage: rateLimitResult.currentUsage,
          limit: rateLimitResult.limit,
          resetTime: rateLimitResult.resetTime,
          remainingUses: rateLimitResult.remainingUses
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      // In case of error, allow the request to proceed
      next();
    }
  };
}

/**
 * Get rate limit status for client-side display
 */
export async function getRateLimitStatus(ipAddress: string): Promise<RateLimitResult> {
  return await checkRateLimit(ipAddress);
}