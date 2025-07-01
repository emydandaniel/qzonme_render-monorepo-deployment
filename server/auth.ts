import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Secure admin configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // Bcrypt hash
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-change-this';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Validate admin credentials
export async function validateAdminCredentials(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) {
    return false;
  }

  // If no hash is set in environment, use a fallback but warn
  if (!ADMIN_PASSWORD_HASH) {
    console.error('⚠️  SECURITY WARNING: ADMIN_PASSWORD_HASH not set in environment');
    // Fallback for development - hash of "qzonmeadmin123"
    const fallbackHash = '$2b$10$8K8K8K8K8K8K8K8K8K8K8u.'; // This should be properly generated
    return await bcrypt.compare(password, fallbackHash);
  }

  return await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

// Generate admin JWT token
export function generateAdminToken(username: string): string {
  return jwt.sign(
    { 
      username, 
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    JWT_SECRET
  );
}

// Verify admin JWT token
export function verifyAdminToken(token: string): { username: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role === 'admin') {
      return { username: decoded.username, role: decoded.role };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Middleware to protect admin routes
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  const token = authHeader.substring(7);
  const adminUser = verifyAdminToken(token);

  if (!adminUser) {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }

  // Add admin user to request object
  (req as any).adminUser = adminUser;
  next();
}

// Rate limiting for admin login attempts
interface LoginAttempt {
  ip: string;
  attempts: number;
  lastAttempt: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    loginAttempts.set(ip, { ip, attempts: 1, lastAttempt: now });
    return true;
  }

  // Reset attempts if lockout period has passed
  if (now - attempt.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.set(ip, { ip, attempts: 1, lastAttempt: now });
    return true;
  }

  // Check if max attempts exceeded
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  // Increment attempts
  attempt.attempts++;
  attempt.lastAttempt = now;
  return true;
}

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}