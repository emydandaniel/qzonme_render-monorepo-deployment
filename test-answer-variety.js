// Test for Answer Variety - Ensures AI-generated questions don't always have the same correct answer
// This tests that correct answers are distributed across A, B, C, D options

import { config } from 'dotenv';

// Load environment variables
config();

console.log('🎯 Testing Answer Distribution Variety');
console.log('='.repeat(50));
console.log('Checking that correct answers vary between A, B, C, D\n');

async function testAnswerVariety() {
  console.log('🚀 Starting answer variety test...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/auto-create/process-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicPrompt: 'Computer Science fundamentals: algorithms, data structures, programming languages, and software engineering principles',
        numberOfQuestions: 12, // Generate enough questions to see pattern
        difficulty: 'Medium',
        language: 'English'
      })
    });
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status}`);
      return;
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.log(`❌ API Error: ${result.error || 'Unknown error'}`);
      return;
    }
    
    const questions = result.data.questions || [];
    console.log(`📊 Generated ${questions.length} questions\n`);
    
    // Analyze answer distribution
    const answerCounts = { A: 0, B: 0, C: 0, D: 0 };
    
    console.log('📝 Question Analysis:');
    questions.forEach((q, index) => {
      const correctAnswer = q.correctAnswer || 'A';
      answerCounts[correctAnswer]++;
      console.log(`   Q${index + 1}: Correct Answer = ${correctAnswer} | "${q.question.substring(0, 60)}..."`);
    });
    
    console.log('\n📈 Answer Distribution Summary:');
    console.log(`   A: ${answerCounts.A} questions (${(answerCounts.A / questions.length * 100).toFixed(1)}%)`);
    console.log(`   B: ${answerCounts.B} questions (${(answerCounts.B / questions.length * 100).toFixed(1)}%)`);
    console.log(`   C: ${answerCounts.C} questions (${(answerCounts.C / questions.length * 100).toFixed(1)}%)`);
    console.log(`   D: ${answerCounts.D} questions (${(answerCounts.D / questions.length * 100).toFixed(1)}%)`);
    
    // Check for good distribution
    const nonZeroAnswers = Object.values(answerCounts).filter(count => count > 0).length;
    const maxAnswerCount = Math.max(...Object.values(answerCounts));
    const minAnswerCount = Math.min(...Object.values(answerCounts).filter(count => count > 0));
    
    console.log('\n🎯 Variety Analysis:');
    
    if (nonZeroAnswers >= 3) {
      console.log(`   ✅ Good variety: ${nonZeroAnswers}/4 answer options used`);
    } else {
      console.log(`   ⚠️  Limited variety: Only ${nonZeroAnswers}/4 answer options used`);
    }
    
    if (maxAnswerCount <= questions.length * 0.6) {
      console.log(`   ✅ No single answer dominates (max: ${maxAnswerCount}/${questions.length})`);
    } else {
      console.log(`   ⚠️  One answer option dominates (${maxAnswerCount}/${questions.length} questions)`);
    }
    
    const variationRange = maxAnswerCount - minAnswerCount;
    if (variationRange <= Math.ceil(questions.length / 4)) {
      console.log(`   ✅ Even distribution (range: ${variationRange})`);
    } else {
      console.log(`   ⚠️  Uneven distribution (range: ${variationRange})`);
    }
    
    // Final assessment
    const isVaried = nonZeroAnswers >= 3 && maxAnswerCount <= questions.length * 0.6;
    console.log(`\n🏆 Overall Assessment: ${isVaried ? '✅ GOOD VARIETY' : '⚠️ NEEDS IMPROVEMENT'}`);
    
    if (isVaried) {
      console.log('   The AI is successfully varying correct answer positions!');
    } else {
      console.log('   The AI may be defaulting to the same answer position.');
      console.log('   Check prompts and ensure answer randomization instructions are clear.');
    }
    
  } catch (error) {
    console.log(`❌ Test Error: ${error.message}`);
    console.log(`   ℹ️  Make sure the server is running on localhost:5000`);
  }
}

console.log('🔧 Instructions:');
console.log('1. Make sure your server is running: npm run dev');
console.log('2. This test will check if AI varies correct answer positions');
console.log('3. Good quiz apps should have answers distributed across A, B, C, D\n');

testAnswerVariety().catch(console.error);
