// Simple test script for Meta Llama Vision integration
// Run with: node --loader tsx/esm test-llama-vision.ts

import { generateQuestionsWithLlama } from './server/services/llamaVisionService.js';

async function testLlamaVision() {
  console.log('🦙 Testing Meta Llama Vision Integration...\n');

  // Check if API key is configured
  console.log('📋 Environment Check:');
  console.log('- Together.ai API Key:', process.env.TOGETHER_AI_API_KEY ? 'Configured' : 'Not configured');
  console.log('- Node Environment:', process.env.NODE_ENV || 'not set');
  console.log('');

  if (!process.env.TOGETHER_AI_API_KEY) {
    console.log('❌ TOGETHER_AI_API_KEY environment variable is not set');
    console.log('Please add your Together.ai API key to the .env file');
    return;
  }

  if (process.env.TOGETHER_AI_API_KEY === 'your_together_ai_api_key_here') {
    console.log('❌ TOGETHER_AI_API_KEY is set to placeholder value');
    console.log('Please add your actual Together.ai API key to the .env file');
    return;
  }

  // Test basic question generation
  const testRequest = {
    content: "The capital of France is Paris. It is located in the Île-de-France region and is famous for landmarks like the Eiffel Tower, the Louvre Museum, and Notre-Dame Cathedral. Paris is also known as the City of Light.",
    numberOfQuestions: 2,
    difficulty: 'Easy' as const,
    language: 'English' as const,
    contentType: 'topic' as const
  };

  console.log('🧪 Testing Question Generation:');
  console.log('- Content:', testRequest.content.substring(0, 50) + '...');
  console.log('- Questions:', testRequest.numberOfQuestions);
  console.log('- Difficulty:', testRequest.difficulty);
  console.log('- Language:', testRequest.language);
  console.log('');

  try {
    console.log('⏳ Generating questions with Meta Llama Vision...');
    const startTime = Date.now();
    
    const result = await generateQuestionsWithLlama(testRequest);
    
    const endTime = Date.now();
    console.log(`⏱️ Processing completed in ${endTime - startTime}ms\n`);

    if (result.success) {
      console.log('✅ Success! Generated questions:');
      console.log('📊 Metadata:');
      console.log('- AI Model:', result.metadata.aiModel);
      console.log('- Requested Count:', result.metadata.requestedCount);
      console.log('- Generated Count:', result.metadata.generatedCount);
      console.log('- Quality Score:', result.metadata.qualityScore);
      console.log('- Processing Time:', result.metadata.processingTime + 'ms');
      console.log('');

      result.questions.forEach((q, index) => {
        console.log(`📝 Question ${index + 1}:`);
        console.log(`   Q: ${q.question}`);
        console.log(`   A: ${q.options[0]}`);
        console.log(`   B: ${q.options[1]}`);
        console.log(`   C: ${q.options[2]}`);
        console.log(`   D: ${q.options[3]}`);
        console.log(`   ✓ Correct: ${q.correctAnswer}`);
        if (q.explanation) {
          console.log(`   💡 Explanation: ${q.explanation}`);
        }
        console.log('');
      });

    } else {
      console.log('❌ Generation failed:');
      console.log('- Error:', result.metadata.error);
      console.log('- AI Model:', result.metadata.aiModel);
      console.log('- Processing Time:', result.metadata.processingTime + 'ms');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Load environment variables
import { config } from 'dotenv';
config();

// Run the test
testLlamaVision().catch(console.error);
