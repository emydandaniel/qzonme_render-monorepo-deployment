/**
 * Test the new DeepSeek R1 Distill 70B Free service
 */

import { generateQuestionsWithDeepSeekR1 } from './server/services/llamaTextService.js';

async function testDeepSeekR1Service() {
  console.log('🧪 Testing DeepSeek R1 Distill 70B Free service...\n');

  const testRequest = {
    content: `
      Artificial Intelligence (AI) is a branch of computer science that aims to create machines 
      capable of intelligent behavior. Machine learning is a subset of AI that enables computers 
      to learn and make decisions from data without being explicitly programmed. Deep learning, 
      a subset of machine learning, uses neural networks with multiple layers to analyze and 
      learn from large amounts of data. These technologies are revolutionizing industries like 
      healthcare, finance, transportation, and entertainment.
      
      Natural Language Processing (NLP) is another important area of AI that focuses on helping 
      computers understand, interpret, and generate human language. Computer vision enables 
      machines to interpret and understand visual information from the world, such as images 
      and videos. These AI technologies work together to create intelligent systems that can 
      see, understand, and respond to their environment.
    `,
    numberOfQuestions: 5, // Minimum required for testing
    difficulty: 'Medium',
    language: 'English',
    contentType: 'document'
  };

  try {
    console.log('📝 Test Request:');
    console.log(`- Content length: ${testRequest.content.length} characters`);
    console.log(`- Questions requested: ${testRequest.numberOfQuestions}`);
    console.log(`- Difficulty: ${testRequest.difficulty}`);
    console.log(`- Language: ${testRequest.language}`);
    console.log();

    const startTime = Date.now();
    const result = await generateQuestionsWithDeepSeekR1(testRequest);
    const duration = Date.now() - startTime;

    console.log('📊 Test Results:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Processing time: ${duration}ms`);
    console.log(`- AI Model: ${result.metadata.aiModel}`);
    console.log(`- Questions generated: ${result.metadata.generatedCount}/${result.metadata.requestedCount}`);
    console.log(`- Quality score: ${result.metadata.qualityScore}/10`);
    
    if (result.metadata.error) {
      console.log(`- Error: ${result.metadata.error}`);
    }
    console.log();

    if (result.success && result.questions.length > 0) {
      console.log('✅ Generated Questions:');
      console.log('='.repeat(50));
      
      result.questions.forEach((question, index) => {
        console.log(`\n${index + 1}. ${question.question}`);
        console.log(`   A) ${question.options[0]}`);
        console.log(`   B) ${question.options[1]}`);
        console.log(`   C) ${question.options[2]}`);
        console.log(`   D) ${question.options[3]}`);
        console.log(`   ✅ Correct Answer: ${question.correctAnswer}`);
        console.log(`   💡 Topic: ${question.topic}`);
        if (question.explanation) {
          console.log(`   📚 Explanation: ${question.explanation}`);
        }
      });
      
      console.log('\n🎯 Answer Distribution Analysis:');
      const answerCounts = { A: 0, B: 0, C: 0, D: 0 };
      result.questions.forEach(q => {
        answerCounts[q.correctAnswer]++;
      });
      console.log(`   A: ${answerCounts.A} | B: ${answerCounts.B} | C: ${answerCounts.C} | D: ${answerCounts.D}`);
      
      const isBalanced = Object.values(answerCounts).every(count => count >= 1);
      console.log(`   Distribution is ${isBalanced ? '✅ BALANCED' : '⚠️ UNBALANCED'}`);
      
      console.log('\n🔍 Quality Assessment:');
      const avgQuestionLength = result.questions.reduce((sum, q) => sum + q.question.length, 0) / result.questions.length;
      const avgOptionLength = result.questions.reduce((sum, q) => 
        sum + q.options.reduce((optSum, opt) => optSum + opt.length, 0) / 4, 0) / result.questions.length;
      
      console.log(`   Average question length: ${Math.round(avgQuestionLength)} characters`);
      console.log(`   Average option length: ${Math.round(avgOptionLength)} characters`);
      console.log(`   All questions have explanations: ${result.questions.every(q => q.explanation && q.explanation.length > 10) ? '✅' : '❌'}`);
      console.log(`   All questions have topics: ${result.questions.every(q => q.topic && q.topic.length > 2) ? '✅' : '❌'}`);
      
    } else {
      console.log('❌ No questions generated or test failed');
      if (result.metadata.error) {
        console.log(`Error details: ${result.metadata.error}`);
      }
    }

  } catch (error) {
    console.error('🚨 Test failed with error:', error);
    if (error.message && error.message.includes('rate limit')) {
      console.log('\n💡 This appears to be a rate limit error. This is expected on the free tier.');
      console.log('The service includes automatic fallback to Google AI when this happens.');
    }
  }
}

// Run the test
testDeepSeekR1Service()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test crashed:', error);
    process.exit(1);
  });
