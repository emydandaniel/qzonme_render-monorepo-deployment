// Simple test to verify our server can start
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🔧 Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- Together.ai API Key:', process.env.TOGETHER_AI_API_KEY ? 'Configured ✅' : 'Not configured ❌');
console.log('- Google AI Key:', process.env.GOOGLE_AI_STUDIO_API_KEY ? 'Configured ✅' : 'Not configured ❌');
console.log('- Database URL:', process.env.DATABASE_URL ? 'Configured ✅' : 'Not configured ❌');

console.log('\n🚀 Starting server imports...');

try {
  // Import our services to check for any import errors
  console.log('📦 Importing services...');
  
  // Test import of our main services
  const { generateQuestions } = await import('./server/services/hybridAIService.ts');
  console.log('✅ Hybrid AI Service imported successfully');
  
  const { generateQuestionsWithLlama } = await import('./server/services/llamaVisionService.ts');
  console.log('✅ Llama Vision Service imported successfully');
  
  console.log('\n🎉 All imports successful! Server should be able to start.');
  
} catch (error) {
  console.error('❌ Import error:', error);
  console.error('Stack:', error.stack);
}
