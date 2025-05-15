import { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

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
  
  // Get all contact messages (this would typically be an admin-only endpoint)
  app.get('/api/contact/messages', async (req: Request, res: Response) => {
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