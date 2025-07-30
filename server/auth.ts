import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Secure admin configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // Bcrypt hash
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-change-this';

// Enhanced security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_JWT_AGE = 24 * 60 * 60; // 24 hours in seconds
const SALT_ROUNDS = 12; // Increased from default 10 for better security
const TOKEN_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Track failed login attempts and suspicious activity
interface LoginAttempt {
  ip: string;
  attempts: number;
  lastAttempt: number;
  userAgent?: string;
  isLocked?: boolean;
}

interface SuspiciousActivity {
  ip: string;
  attempts: number;
  lastAttempt: number;
  pattern: 'rapid_requests' | 'invalid_tokens' | 'brute_force';
}

interface TokenInfo {
  jti: string; // JWT ID for token tracking
  issued: number;
  ip: string;
  userAgent?: string;
}

const loginAttempts = new Map<string, LoginAttempt>();
const suspiciousActivities = new Map<string, SuspiciousActivity>();
const validTokens = new Map<string, TokenInfo>(); // Track valid tokens for invalidation

// Generate secure random JWT ID
function generateJWT_ID(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Enhanced admin credential validation with additional security checks
export async function validateAdminCredentials(
  username: string, 
  password: string, 
  ip: string = 'unknown',
  userAgent?: string
): Promise<{ isValid: boolean; reason?: string }> {
  // Check for suspicious activity first
  if (isSuspiciousIP(ip)) {
    logSecurityEvent('suspicious_login_attempt', { ip, username, userAgent });
    return { isValid: false, reason: 'IP temporarily blocked due to suspicious activity' };
  }

  // Basic username check
  if (username !== ADMIN_USERNAME) {
    recordFailedAttempt(ip, 'invalid_username', userAgent);
    return { isValid: false, reason: 'Invalid credentials' };
  }

  // Password validation
  if (!ADMIN_PASSWORD_HASH) {
    console.error('⚠️  SECURITY WARNING: ADMIN_PASSWORD_HASH not set in environment');
    // For development only - verify against the known password directly
    // In production, this should use a proper bcrypt hash from environment
    if (password === 'qzonmeadmin123') {
      console.log('✅ Admin authenticated using development fallback');
      return { isValid: true };
    }
    recordFailedAttempt(ip, 'invalid_password', userAgent);
    return { isValid: false, reason: 'Authentication configuration error' };
  }

  try {
    const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    
    if (!isValidPassword) {
      recordFailedAttempt(ip, 'invalid_password', userAgent);
      return { isValid: false, reason: 'Invalid credentials' };
    }

    // Success - reset any failed attempts for this IP
    resetRateLimit(ip);
    logSecurityEvent('successful_admin_login', { ip, username, userAgent });
    
    return { isValid: true };
  } catch (error) {
    console.error('🚨 Error during password verification:', error);
    recordFailedAttempt(ip, 'authentication_error', userAgent);
    return { isValid: false, reason: 'Authentication error' };
  }
}

// Enhanced JWT token generation with tracking
export function generateAdminToken(
  username: string, 
  ip: string = 'unknown', 
  userAgent?: string
): string {
  const jti = generateJWT_ID();
  const issued = Math.floor(Date.now() / 1000);
  const exp = issued + MAX_JWT_AGE;

  // Track this token
  validTokens.set(jti, {
    jti,
    issued: Date.now(),
    ip,
    userAgent
  });

  const token = jwt.sign(
    { 
      username, 
      role: 'admin',
      iat: issued,
      exp: exp,
      jti: jti, // JWT ID for tracking
      iss: 'qzonme-admin', // Issuer
      aud: 'qzonme-api' // Audience
    },
    JWT_SECRET,
    {
      algorithm: 'HS256' // Explicitly specify algorithm to prevent attacks
    }
  );

  logSecurityEvent('token_generated', { username, jti, ip, userAgent });
  return token;
}

// Enhanced JWT token verification with security checks
export function verifyAdminToken(
  token: string, 
  ip: string = 'unknown'
): { username: string; role: string; jti?: string } | null {
  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Only allow HS256
      issuer: 'qzonme-admin',
      audience: 'qzonme-api'
    }) as any;

    // Additional checks
    if (decoded.role !== 'admin') {
      recordSuspiciousActivity(ip, 'invalid_tokens');
      return null;
    }

    // Check if token is in our valid tokens list
    if (decoded.jti && !validTokens.has(decoded.jti)) {
      logSecurityEvent('invalid_token_used', { jti: decoded.jti, ip });
      recordSuspiciousActivity(ip, 'invalid_tokens');
      return null;
    }

    return { 
      username: decoded.username, 
      role: decoded.role,
      jti: decoded.jti 
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      recordSuspiciousActivity(ip, 'invalid_tokens');
      logSecurityEvent('invalid_token_attempt', { 
        ip, 
        error: error.message,
        tokenPreview: token.substring(0, 20) + '...'
      });
    }
    return null;
  }
}

// Enhanced admin middleware with additional security
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logSecurityEvent('missing_auth_header', { ip: clientIp, userAgent, path: req.path });
    return res.status(401).json({ 
      message: 'Admin authentication required',
      error: 'MISSING_AUTH_HEADER'
    });
  }

  const token = authHeader.substring(7);
  
  // Basic token format validation
  if (!token || token.length < 20) {
    recordSuspiciousActivity(clientIp, 'invalid_tokens');
    return res.status(401).json({ 
      message: 'Invalid token format',
      error: 'INVALID_TOKEN_FORMAT'
    });
  }

  const adminUser = verifyAdminToken(token, clientIp);

  if (!adminUser) {
    return res.status(401).json({ 
      message: 'Invalid or expired admin token',
      error: 'INVALID_TOKEN'
    });
  }

  // Add admin user info to request
  (req as any).adminUser = adminUser;
  (req as any).tokenJTI = adminUser.jti;
  
  next();
}

// Rate limiting with enhanced tracking
export function checkRateLimit(ip: string, userAgent?: string): boolean {
  const now = Date.now();
  const key = ip;
  const attempt = loginAttempts.get(key);

  if (!attempt) {
    loginAttempts.set(key, { 
      ip, 
      attempts: 1, 
      lastAttempt: now,
      userAgent
    });
    return true;
  }

  // Reset attempts if lockout period has passed
  if (now - attempt.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.set(key, { 
      ip, 
      attempts: 1, 
      lastAttempt: now,
      userAgent
    });
    return true;
  }

  // Check if max attempts exceeded
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.isLocked = true;
    recordSuspiciousActivity(ip, 'brute_force');
    return false;
  }

  // Increment attempts
  attempt.attempts++;
  attempt.lastAttempt = now;
  attempt.userAgent = userAgent;
  
  return true;
}

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// Record failed login attempts with categorization
function recordFailedAttempt(
  ip: string, 
  reason: 'invalid_username' | 'invalid_password' | 'authentication_error',
  userAgent?: string
): void {
  const now = Date.now();
  const key = ip;
  
  let attempt = loginAttempts.get(key);
  if (!attempt) {
    attempt = { ip, attempts: 0, lastAttempt: now, userAgent };
    loginAttempts.set(key, attempt);
  }
  
  attempt.attempts++;
  attempt.lastAttempt = now;
  
  logSecurityEvent('failed_login_attempt', { 
    ip, 
    reason, 
    attempts: attempt.attempts,
    userAgent 
  });
}

// Track suspicious activity patterns
function recordSuspiciousActivity(
  ip: string,
  pattern: 'rapid_requests' | 'invalid_tokens' | 'brute_force'
): void {
  const now = Date.now();
  const key = `${ip}-${pattern}`;
  
  let activity = suspiciousActivities.get(key);
  if (!activity) {
    activity = { ip, attempts: 0, lastAttempt: now, pattern };
    suspiciousActivities.set(key, activity);
  }
  
  activity.attempts++;
  activity.lastAttempt = now;
  
  // Log if threshold exceeded
  if (activity.attempts >= 3) {
    logSecurityEvent('suspicious_activity_threshold', { 
      ip, 
      pattern, 
      attempts: activity.attempts 
    });
  }
}

// Check if IP has suspicious activity
function isSuspiciousIP(ip: string): boolean {
  const now = Date.now();
  const suspiciousWindow = 30 * 60 * 1000; // 30 minutes
  
  const activities = Array.from(suspiciousActivities.values());
  for (const activity of activities) {
    if (activity.ip === ip && 
        (now - activity.lastAttempt) < suspiciousWindow && 
        activity.attempts >= 5) {
      return true;
    }
  }
  
  return false;
}

// Security event logging
function logSecurityEvent(
  event: string, 
  details: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...details
  };
  
  // In production, you might want to send this to a security monitoring service
  console.log(`🔒 Security Event [${event}]:`, logEntry);
}

// Token management functions
export function invalidateToken(jti: string): boolean {
  if (validTokens.has(jti)) {
    validTokens.delete(jti);
    logSecurityEvent('token_invalidated', { jti });
    return true;
  }
  return false;
}

export function invalidateAllTokens(): number {
  const count = validTokens.size;
  validTokens.clear();
  logSecurityEvent('all_tokens_invalidated', { count });
  return count;
}

// Cleanup expired tokens and old login attempts
function cleanupExpiredData(): void {
  const now = Date.now();
  const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  // Cleanup expired tokens
  let expiredTokens = 0;
  const tokenEntries = Array.from(validTokens.entries());
  for (const [jti, tokenInfo] of tokenEntries) {
    if (now - tokenInfo.issued > expiredThreshold) {
      validTokens.delete(jti);
      expiredTokens++;
    }
  }
  
  // Cleanup old login attempts
  let expiredAttempts = 0;
  const attemptEntries = Array.from(loginAttempts.entries());
  for (const [key, attempt] of attemptEntries) {
    if (now - attempt.lastAttempt > expiredThreshold) {
      loginAttempts.delete(key);
      expiredAttempts++;
    }
  }
  
  // Cleanup old suspicious activities
  let expiredActivities = 0;
  const activityEntries = Array.from(suspiciousActivities.entries());
  for (const [key, activity] of activityEntries) {
    if (now - activity.lastAttempt > expiredThreshold) {
      suspiciousActivities.delete(key);
      expiredActivities++;
    }
  }
  
  if (expiredTokens > 0 || expiredAttempts > 0 || expiredActivities > 0) {
    logSecurityEvent('security_data_cleanup', {
      expiredTokens,
      expiredAttempts,
      expiredActivities
    });
  }
}

// Start periodic cleanup
setInterval(cleanupExpiredData, TOKEN_CLEANUP_INTERVAL);

// Hash password utility (for generating admin password hashes)
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Get security statistics
export function getSecurityStats(): {
  activeTokens: number;
  blockedIPs: number;
  recentFailedAttempts: number;
  suspiciousActivities: number;
} {
  const now = Date.now();
  const recentWindow = 15 * 60 * 1000; // 15 minutes
  
  const recentFailedAttempts = Array.from(loginAttempts.values())
    .filter(attempt => (now - attempt.lastAttempt) < recentWindow)
    .length;
    
  const blockedIPs = Array.from(loginAttempts.values())
    .filter(attempt => attempt.isLocked && (now - attempt.lastAttempt) < LOCKOUT_DURATION)
    .length;
    
  return {
    activeTokens: validTokens.size,
    blockedIPs,
    recentFailedAttempts,
    suspiciousActivities: suspiciousActivities.size
  };
}