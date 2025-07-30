import { config } from 'dotenv';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// Remove static vite import - will import dynamically when needed
import * as pathModule from "path";
import * as fs from "fs";
import { scheduleCleanupTask } from './cleanup';
import { testCloudinaryConnection } from './cloudinary';
import { 
  setupSecurityMiddleware, 
  setupSpecificRateLimits, 
  setupSecurityErrorHandling,
  sanitizeInput 
} from './middleware/security';

// Load environment variables FIRST
config();

const app = express();

// Set Express environment to match NODE_ENV
app.set('env', process.env.NODE_ENV || 'development');

// Setup security middleware FIRST (before any other middleware)
setupSecurityMiddleware(app);

// Body parsing middleware (with size limits for security)
app.use(express.json({ 
  limit: '10mb',  // Limit JSON payload size
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: false,
  limit: '10mb'  // Limit URL-encoded payload size
}));

// Input sanitization middleware
app.use(sanitizeInput);

// Special route for sitemap.xml - ensure it's served with XML content type
app.get('/sitemap.xml', (req, res) => {
  const sitemapPath = pathModule.join(process.cwd(), 'public', 'sitemap.xml');
  fs.readFile(sitemapPath, (err, data) => {
    if (err) {
      res.status(500).send('Error reading sitemap file');
      return;
    }
    res.header('Content-Type', 'application/xml');
    res.send(data);
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // Import and validate configurations with error handling
  let validateAndReport: () => void;
  let validateServerConfig: () => { isValid: boolean, missingKeys: string[] };

  try {
    const configValidatorModule = await import('./security/configValidator.js');
    validateAndReport = configValidatorModule.validateAndReport;
    
    const autoCreateModule = await import('./config/autoCreate.js');
    validateServerConfig = autoCreateModule.validateServerConfig;
    
    // Validate security configuration
    console.log('🔒 Validating security configuration...');
    validateAndReport();
  } catch (error) {
    console.warn('⚠️ Could not load configuration validators:', error);
    // Provide fallback functions
    validateAndReport = () => console.log('⚠️ Security validation skipped - module not available');
    validateServerConfig = () => ({ isValid: false, missingKeys: ['Configuration module not available'] });
  }

  const server = await registerRoutes(app);

  // Setup endpoint-specific rate limits after routes are registered
  setupSpecificRateLimits(app);

  // Setup security error handling
  setupSecurityErrorHandling(app);

  // Keep the original error handler as fallback
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    try {
      console.log('🔧 Attempting to load Vite for development...');
      // Check if vite module exists before importing
      const vitePath = pathModule.resolve(pathModule.dirname(new URL(import.meta.url).pathname), './vite.js');
      if (fs.existsSync(vitePath)) {
        const viteModule = await import('./vite.js');
        if (viteModule && viteModule.setupVite) {
          await viteModule.setupVite(app, server);
          console.log('✅ Vite development server setup complete');
        } else {
          throw new Error('Vite module loaded but setupVite function not found');
        }
      } else {
        throw new Error('Vite module file not found');
      }
    } catch (error) {
      console.warn('⚠️ Could not setup Vite development server:', error);
      console.log('🔄 Falling back to static file serving...');
      // Fallback to static file serving even in development
      const distPath = pathModule.resolve(pathModule.dirname(new URL(import.meta.url).pathname), "../client/dist");
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        console.log('📁 Serving static files from:', distPath);
      }
    }
  } else {
    console.log('🏭 Production mode: Setting up static file serving...');
    // Serve static files in production
    const distPath = pathModule.resolve(pathModule.dirname(new URL(import.meta.url).pathname), "../client/dist");
    
    if (!fs.existsSync(distPath)) {
      console.error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    } else {
      app.use(express.static(distPath));
    }
    
    // History API fallback - serve index.html for any route that doesn't match an API or static resource
    // This is necessary for client-side routing to work with direct URL access
    app.get('*', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/assets')) {
        return;
      }
      
      // For all other routes, serve the index.html file
      const distPath = pathModule.resolve(pathModule.dirname(new URL(import.meta.url).pathname), "../client/dist");
      res.sendFile(pathModule.resolve(distPath, "index.html"));
    });
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    console.log(`serving on port ${port}`);
    
    // Validate auto-create configuration
    const configValidation = validateServerConfig();
    if (configValidation.isValid) {
      console.log('✅ Auto-Create feature configuration is valid');
    } else {
      console.log('⚠️ Auto-Create feature has configuration issues:');
      for (const key of configValidation.missingKeys) {
        console.log(`  - Missing: ${key}`);
      }
      console.log('Auto-Create feature may not work properly until configuration is fixed.');
    }
    
    // Test Cloudinary connection
    try {
      const cloudinaryTestResult = await testCloudinaryConnection();
      if (cloudinaryTestResult.success) {
        console.log('✅ Cloudinary connection successful');
      } else {
        console.log('⚠️ Warning: Could not connect to Cloudinary - image uploads may fail');
      }
    } catch (error) {
      console.log(`❌ Error testing Cloudinary connection: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Schedule daily cleanup task to run 5 minutes after server start
    scheduleCleanupTask(5 * 60 * 1000);
    console.log('📅 Scheduled daily cleanup task for expired quizzes (7-day retention period)');
  });
})();
