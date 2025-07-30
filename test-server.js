// Simple test server for Meta Llama Vision integration
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple test endpoint for our AI service
app.post('/api/test-llama', async (req, res) => {
  try {
    console.log('🦙 Testing Meta Llama Vision endpoint...');
    
    // Import our service
    const { generateQuestionsWithLlama } = await import('./server/services/llamaVisionService.ts');
    
    const testRequest = {
      content: req.body.content || "The capital of France is Paris. It is located in the Île-de-France region and is famous for landmarks like the Eiffel Tower, the Louvre Museum, and Notre-Dame Cathedral.",
      numberOfQuestions: req.body.numberOfQuestions || 2,
      difficulty: req.body.difficulty || 'Easy',
      language: req.body.language || 'English',
      contentType: 'topic'
    };
    
    console.log('📝 Request:', testRequest);
    
    const result = await generateQuestionsWithLlama(testRequest);
    
    console.log('📊 Result:', {
      success: result.success,
      questionCount: result.questions.length,
      model: result.metadata.aiModel,
      processingTime: result.metadata.processingTime
    });
    
    res.json({
      success: result.success,
      data: {
        questions: result.questions,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple test endpoint for hybrid service (Llama + Gemini fallback)
app.post('/api/test-hybrid', async (req, res) => {
  try {
    console.log('🔄 Testing Hybrid AI service (Llama + Gemini fallback)...');
    
    // Import our hybrid service
    const { generateQuestions } = await import('./server/services/hybridAIService.ts');
    
    const testRequest = {
      content: req.body.content || "The capital of France is Paris. It is located in the Île-de-France region and is famous for landmarks like the Eiffel Tower, the Louvre Museum, and Notre-Dame Cathedral.",
      numberOfQuestions: req.body.numberOfQuestions || 2,
      difficulty: req.body.difficulty || 'Easy',
      language: req.body.language || 'English',
      contentType: 'topic'
    };
    
    console.log('📝 Request:', testRequest);
    
    const result = await generateQuestions(testRequest);
    
    console.log('📊 Result:', {
      success: result.success,
      questionCount: result.questions.length,
      model: result.metadata.aiModel,
      processingTime: result.metadata.processingTime,
      fallbackUsed: result.metadata.fallbackUsed || false
    });
    
    res.json({
      success: result.success,
      data: {
        questions: result.questions,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    console.error('❌ Hybrid test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { checkAIServiceHealth } = await import('./server/services/hybridAIService.ts');
    const healthCheck = await checkAIServiceHealth();
    
    res.json({
      success: true,
      server: 'running',
      timestamp: new Date().toISOString(),
      ai: healthCheck
    });
  } catch (error) {
    res.json({
      success: false,
      server: 'running',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Basic homepage
app.get('/', (req, res) => {
  res.json({
    message: 'QzonMe Meta Llama Vision Test Server',
    endpoints: {
      'POST /api/test-llama': 'Test Meta Llama Vision directly',
      'POST /api/test-hybrid': 'Test Hybrid AI service (Llama + Gemini fallback)',
      'GET /api/health': 'Check AI service health'
    },
    environment: {
      node_env: process.env.NODE_ENV,
      together_api: process.env.TOGETHER_AI_API_KEY ? 'configured' : 'missing',
      google_ai: process.env.GOOGLE_AI_STUDIO_API_KEY ? 'configured' : 'missing'
    }
  });
});

app.listen(PORT, () => {
  console.log('🚀 QzonMe Meta Llama Vision Test Server running on port', PORT);
  console.log('🔗 Test endpoints:');
  console.log('  - GET  http://localhost:' + PORT + '/ (Server info)');
  console.log('  - GET  http://localhost:' + PORT + '/api/health (AI health check)');
  console.log('  - POST http://localhost:' + PORT + '/api/test-llama (Test Llama directly)');
  console.log('  - POST http://localhost:' + PORT + '/api/test-hybrid (Test hybrid service)');
  console.log('');
  console.log('🔧 Environment:');
  console.log('  - Together.ai API:', process.env.TOGETHER_AI_API_KEY ? 'Configured ✅' : 'Missing ❌');
  console.log('  - Google AI API:', process.env.GOOGLE_AI_STUDIO_API_KEY ? 'Configured ✅' : 'Missing ❌');
});
