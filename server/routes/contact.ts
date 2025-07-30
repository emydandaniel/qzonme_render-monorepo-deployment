import { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAdmin, validateAdminCredentials, generateAdminToken, checkRateLimit, resetRateLimit } from '../auth';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
}

const CONTACT_MESSAGES_DIR = path.join(process.cwd(), 'contact_messages');

// Ensure the contact_messages directory exists
if (!fs.existsSync(CONTACT_MESSAGES_DIR)) {
  fs.mkdirSync(CONTACT_MESSAGES_DIR, { recursive: true });
}

export function registerContactRoutes(app: Express) {
  // Submit a new contact message
  app.post('/api/contact', async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;
      
      // Validate required fields
      if (!name || !email || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, and message are required' 
        });
      }
      
      // Create a new message object
      const contactMessage: ContactMessage = {
        id: Date.now().toString(),
        name,
        email,
        message,
        timestamp: new Date().toISOString()
      };
      
      // Save the message to a JSON file in the contact_messages directory
      const filePath = path.join(CONTACT_MESSAGES_DIR, `${contactMessage.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(contactMessage, null, 2));
      
      // Return success response
      res.status(201).json({ 
        success: true, 
        message: 'Contact message submitted successfully',
        id: contactMessage.id
      });
    } catch (error) {
      console.error('Error saving contact message:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save your message. Please try again.' 
      });
    }
  });
  
  // Admin login endpoint
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      // Check rate limiting
      if (!checkRateLimit(clientIp, userAgent)) {
        return res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again in 15 minutes.',
          error: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // Validate credentials with enhanced security
      const validationResult = await validateAdminCredentials(username, password, clientIp, userAgent);
      
      if (!validationResult.isValid) {
        return res.status(401).json({
          success: false,
          message: validationResult.reason || 'Invalid credentials',
          error: 'AUTHENTICATION_FAILED'
        });
      }

      // Reset rate limit on successful login
      resetRateLimit(clientIp);

      // Generate JWT token with tracking
      const token = generateAdminToken(username, clientIp, userAgent);

      res.status(200).json({
        success: true,
        token,
        message: 'Admin login successful',
        expiresIn: '24h'
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed due to server error',
        error: 'SERVER_ERROR'
      });
    }
  });

  // Get all contact messages (ADMIN ONLY - now properly secured)
  app.get('/api/contact/messages', requireAdmin, async (req: Request, res: Response) => {
    try {
      // Read all message files from the directory
      const files = fs.readdirSync(CONTACT_MESSAGES_DIR);
      const messages: ContactMessage[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(CONTACT_MESSAGES_DIR, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const message = JSON.parse(fileContent) as ContactMessage;
          messages.push(message);
        }
      }
      
      // Sort messages by timestamp (newest first)
      messages.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      res.status(200).json({ 
        success: true, 
        messages 
      });
    } catch (error) {
      console.error('Error retrieving contact messages:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve contact messages.' 
      });
    }
  });
}