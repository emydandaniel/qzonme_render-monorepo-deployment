// Quick test to verify DeepSeek R1 API is working
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testDeepSeekR1() {
  console.log('🧪 Testing DeepSeek R1 Distill 70B Free API...');
  
  const testRequest = {
    content: "The capital of France is Paris. It is known for the Eiffel Tower, the Louvre Museum, and being the center of French culture and government. Paris is located on the Seine River.",
    numberOfQuestions: 5,
    difficulty: 'Easy',
    language: 'English',
    contentType: 'topic'
  };

  try {
    console.log('🚀 Making test request to DeepSeek R1...');
    const result = await generateQuestionsWithDeepSeekR1(testRequest);
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Questions generated: ${result.questions.length}/${testRequest.numberOfQuestions}`);
    console.log(`⏱️ Processing time: ${result.metadata.processingTime}ms`);
    console.log(`🤖 AI Model: ${result.metadata.aiModel}`);
    console.log(`⭐ Quality score: ${result.metadata.qualityScore}/10`);
    
    if (result.success && result.questions.length > 0) {
      console.log('\n🎯 Sample Question:');
      const firstQuestion = result.questions[0];
      console.log(`Q: ${firstQuestion.question}`);
      console.log(`A) ${firstQuestion.options[0]}`);
      console.log(`B) ${firstQuestion.options[1]}`);
      console.log(`C) ${firstQuestion.options[2]}`);
      console.log(`D) ${firstQuestion.options[3]}`);
      console.log(`✅ Correct: ${firstQuestion.correctAnswer}`);
    }
    
    if (!result.success) {
      console.error('❌ Error:', result.metadata.error);
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.message);
  }
}

testDeepSeekR1();
