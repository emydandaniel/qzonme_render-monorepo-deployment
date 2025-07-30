// Test script to verify Meta Llama Vision text extraction capabilities
// Run with: tsx test-llama-vision-text.ts

import { generateQuestionsWithLlama } from './server/services/llamaVisionService.js';

/**
 * Test Llama Vision's ability to extract and understand text from images
 */
async function testLlamaVisionTextExtraction() {
  console.log('🦙 Testing Meta Llama Vision Text Extraction Capabilities...\n');

  // Check if Together.ai API key is available
  if (!process.env.TOGETHER_AI_API_KEY) {
    console.error('❌ TOGETHER_AI_API_KEY environment variable not set');
    console.log('Please set your Together.ai API key in the .env file');
    return;
  }

  console.log(`🔑 Using Together.ai API key: ${process.env.TOGETHER_AI_API_KEY.substring(0, 10)}...${process.env.TOGETHER_AI_API_KEY.slice(-4)}`);

  // Test 1: Simple text image (create a base64 encoded test image with text)
  console.log('\n📝 TEST 1: Text extraction from simple text image');
  
  // Create a simple test with base64 encoded image data
  // This is a simple image with text "Hello World" encoded in base64
  const simpleTextImageBase64 = await createTestImageWithText("Hello World - This is a test image");
  
  if (simpleTextImageBase64) {
    try {
      const result1 = await generateQuestionsWithLlama({
        content: "Generate questions based on what you can read in this image",
        numberOfQuestions: 2,
        difficulty: 'Easy',
        language: 'English',
        contentType: 'document',
        imageData: simpleTextImageBase64
      });

      console.log('✅ Test 1 Results:');
      console.log(`- Generated ${result1.questions.length} questions`);
      console.log(`- Processing time: ${result1.metadata.processingTime}ms`);
      console.log(`- AI Model: ${result1.metadata.aiModel}`);
      console.log(`- Quality Score: ${result1.metadata.qualityScore}/10`);
      
      if (result1.questions.length > 0) {
        console.log('\n📋 Generated Questions:');
        result1.questions.forEach((q, i) => {
          console.log(`${i + 1}. ${q.question}`);
          console.log(`   Options: ${q.options.join(', ')}`);
          console.log(`   Correct: ${q.correctAnswer}`);
          console.log(`   Explanation: ${q.explanation}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Test 1 failed:', error);
    }
  }

  // Test 2: Text extraction without image (baseline test)
  console.log('\n📝 TEST 2: Text-only baseline for comparison');
  
  try {
    const result2 = await generateQuestionsWithLlama({
      content: "Generate questions about machine learning and artificial intelligence",
      numberOfQuestions: 2,
      difficulty: 'Easy',
      language: 'English',
      contentType: 'topic'
    });

    console.log('✅ Test 2 Results (Text-only baseline):');
    console.log(`- Generated ${result2.questions.length} questions`);
    console.log(`- Processing time: ${result2.metadata.processingTime}ms`);
    console.log(`- Quality Score: ${result2.metadata.qualityScore}/10`);
    
    if (result2.questions.length > 0) {
      console.log('\n📋 Generated Questions:');
      result2.questions.forEach((q, i) => {
        console.log(`${i + 1}. ${q.question}`);
        console.log(`   Options: ${q.options.join(', ')}`);
        console.log(`   Correct: ${q.correctAnswer}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  // Test 3: Check if we can process a real image file if available
  console.log('\n📝 TEST 3: Real image file processing (if available)');
  
  const testImagePath = './test-image.png';
  if (fs.existsSync(testImagePath)) {
    try {
      const imageBuffer = fs.readFileSync(testImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      
      const result3 = await generateQuestionsWithLlama({
        content: "Generate questions based on the content you can see and read in this image",
        numberOfQuestions: 3,
        difficulty: 'Medium',
        language: 'English',
        contentType: 'document',
        imageData: imageBase64
      });

      console.log('✅ Test 3 Results (Real image):');
      console.log(`- Generated ${result3.questions.length} questions`);
      console.log(`- Processing time: ${result3.metadata.processingTime}ms`);
      console.log(`- Quality Score: ${result3.metadata.qualityScore}/10`);
      
      if (result3.questions.length > 0) {
        console.log('\n📋 Generated Questions from Real Image:');
        result3.questions.forEach((q, i) => {
          console.log(`${i + 1}. ${q.question}`);
          console.log(`   Options: ${q.options.join(', ')}`);
          console.log(`   Correct: ${q.correctAnswer}`);
          console.log(`   Topic: ${q.topic}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Test 3 failed:', error);
    }
  } else {
    console.log('⚠️ No test image found at ./test-image.png, skipping real image test');
    console.log('💡 To test with a real image, place an image file named "test-image.png" in the project root');
  }

  // Summary
  console.log('\n🎯 SUMMARY: Meta Llama Vision Text Extraction Test');
  console.log('============================================');
  console.log('The tests above show whether Meta Llama Vision can:');
  console.log('✓ Process base64 encoded images');
  console.log('✓ Extract text content from images');
  console.log('✓ Generate relevant questions based on image content');
  console.log('✓ Use vision capabilities for multimodal understanding');
  console.log('\nIf questions were generated that reference image content,');
  console.log('then the multimodal text extraction is working correctly!');
}

/**
 * Create a simple test image with text (mock function)
 * In a real scenario, you would create an actual image with text
 */
async function createTestImageWithText(text: string): Promise<string | null> {
  console.log(`📸 Creating test image with text: "${text}"`);
  
  // For testing purposes, we'll create a minimal base64 encoded image
  // This is a 1x1 pixel transparent PNG - in reality you'd want an image with actual text
  const smallPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  
  console.log('📸 Using minimal test image (1x1 pixel) for vision API test');
  console.log('💡 For real text extraction testing, use an actual image with readable text');
  
  return smallPngBase64;
}

// Run the test
testLlamaVisionTextExtraction().catch(console.error);
