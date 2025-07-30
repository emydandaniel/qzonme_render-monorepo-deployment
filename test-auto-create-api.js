// Practical Auto Create Quiz API Test
// Tests the actual API endpoints for OCR and YouTube functionality

import { config } from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

// Load environment variables
config();

console.log('🧪 Auto Create Quiz API Tests');
console.log('='.repeat(50));
console.log('Testing actual API endpoints and functionality\n');

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/auto-create`;

// Test results storage
let testResults = {
  server: { running: false },
  youtube: { api: false, extraction: false },
  ocr: { processing: false },
  autoCreate: { workflow: false }
};

// Check if server is running
async function checkServer() {
  console.log('🔍 Checking if development server is running...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    console.log('   ✅ Server is running and responsive');
    testResults.server.running = true;
    return true;
  } catch (error) {
    console.log('   ❌ Server is not running or not accessible');
    console.log('   💡 Please start the development server with: npm run dev');
    testResults.server.running = false;
    return false;
  }
}

// Test YouTube API integration
async function testYouTubeIntegration() {
  console.log('\n📺 Testing YouTube API Integration...');
  
  if (!testResults.server.running) {
    console.log('   ❌ Skipping - server not running');
    return false;
  }
  
  try {
    // Test YouTube link extraction
    const testData = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      type: 'youtube'
    };
    
    console.log(`   🔗 Testing URL: ${testData.url}`);
    
    const response = await axios.post(`${API_BASE}/extract-link`, testData, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.success) {
      console.log('   ✅ YouTube API integration working!');
      console.log(`   📝 Content extracted: ${response.data.data.content.length} characters`);
      console.log(`   🎯 Quality score: ${response.data.data.quality}/10`);
      console.log(`   📊 Content type: ${response.data.data.contentType}`);
      
      testResults.youtube.extraction = true;
      return true;
    } else {
      console.log('   ❌ YouTube extraction failed');
      console.log(`   Error: ${response.data.message || 'Unknown error'}`);
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ YouTube API test failed');
    if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

// Test OCR processing (if we can create a test image)
async function testOCRProcessing() {
  console.log('\n🖼️  Testing OCR Processing...');
  
  if (!testResults.server.running) {
    console.log('   ❌ Skipping - server not running');
    return false;
  }
  
  try {
    // Check if we have any existing test images
    const testImagePaths = [
      './test-image.jpg',
      './test-image.png',
      './uploads/test.jpg',
      './temp_uploads/test.png'
    ];
    
    let testImagePath = null;
    for (const path of testImagePaths) {
      if (fs.existsSync(path)) {
        testImagePath = path;
        break;
      }
    }
    
    if (!testImagePath) {
      console.log('   ⚠️  No test image found');
      console.log('   💡 To test OCR functionality:');
      console.log('      1. Place a test image (jpg/png) in the project root');
      console.log('      2. Name it "test-image.jpg" or "test-image.png"');
      console.log('      3. Re-run this test');
      return false;
    }
    
    console.log(`   📸 Found test image: ${testImagePath}`);
    
    // Create form data for file upload
    const form = new FormData();
    form.append('files', fs.createReadStream(testImagePath));
    
    const response = await axios.post(`${API_BASE}/ocr-process`, form, {
      timeout: 60000,
      headers: { ...form.getHeaders() }
    });
    
    if (response.data.success) {
      console.log('   ✅ OCR processing working!');
      console.log(`   📝 Text extracted: ${response.data.data.content.length} characters`);
      console.log(`   🎯 Quality score: ${response.data.data.quality}/10`);
      console.log(`   📊 Confidence: ${(response.data.data.confidence * 100).toFixed(1)}%`);
      
      if (response.data.data.content.length > 0) {
        console.log(`   📄 Sample text: "${response.data.data.content.substring(0, 100)}..."`);
      }
      
      testResults.ocr.processing = true;
      return true;
    } else {
      console.log('   ❌ OCR processing failed');
      console.log(`   Error: ${response.data.message || 'Unknown error'}`);
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ OCR test failed');
    if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

// Test full auto-create workflow
async function testAutoCreateWorkflow() {
  console.log('\n🔗 Testing Complete Auto Create Workflow...');
  
  if (!testResults.server.running) {
    console.log('   ❌ Skipping - server not running');
    return false;
  }
  
  try {
    // Test with a topic-based generation (doesn't require files)
    const form = new FormData();
    form.append('topicPrompt', 'Create questions about basic mathematics including addition, subtraction, and multiplication');
    form.append('numberOfQuestions', '5');
    form.append('difficulty', 'Medium');
    form.append('language', 'English');
    
    console.log('   🧠 Testing topic-based question generation...');
    
    const response = await axios.post(`${API_BASE}/process-content`, form, {
      timeout: 120000, // 2 minutes for AI processing
      headers: { ...form.getHeaders() }
    });
    
    if (response.data.success) {
      console.log('   ✅ Auto Create workflow working!');
      console.log(`   📝 Generated ${response.data.data.questions.length} questions`);
      console.log(`   ⏱️  Processing time: ${response.data.data.metadata.totalProcessingTime}ms`);
      console.log(`   🤖 AI model: ${response.data.data.metadata.aiModel || 'Not specified'}`);
      
      // Show sample question
      if (response.data.data.questions.length > 0) {
        const sampleQ = response.data.data.questions[0];
        console.log(`   📋 Sample question: "${sampleQ.question}"`);
        console.log(`   ✓ Options: ${sampleQ.options.length} choices`);
        console.log(`   ✓ Correct answer: ${sampleQ.correctAnswer}`);
      }
      
      testResults.autoCreate.workflow = true;
      return true;
    } else {
      console.log('   ❌ Auto Create workflow failed');
      console.log(`   Error: ${response.data.message || 'Unknown error'}`);
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Auto Create workflow test failed');
    if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
      if (error.response.data?.processingResults) {
        console.log('   📊 Processing details:', JSON.stringify(error.response.data.processingResults, null, 2));
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

// Test AI health check
async function testAIHealth() {
  console.log('\n🤖 Testing AI Service Health...');
  
  if (!testResults.server.running) {
    console.log('   ❌ Skipping - server not running');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/ai-health`, { timeout: 30000 });
    
    if (response.data.success) {
      console.log('   ✅ AI services are healthy!');
      
      const healthData = response.data.data;
      console.log(`   🦙 Llama Vision: ${healthData.llamaVision?.status || 'Unknown'}`);
      console.log(`   🤖 Gemini AI: ${healthData.gemini?.status || 'Unknown'}`);
      console.log(`   ⭐ Primary service: ${healthData.primaryService || 'Unknown'}`);
      
      return true;
    } else {
      console.log('   ❌ AI health check failed');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ AI health check failed');
    if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

// Test usage limits
async function testUsageLimits() {
  console.log('\n📊 Testing Usage Limits & Rate Limiting...');
  
  if (!testResults.server.running) {
    console.log('   ❌ Skipping - server not running');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/usage-status`, { timeout: 10000 });
    
    if (response.data.success) {
      console.log('   ✅ Usage tracking is working!');
      
      const usageData = response.data.data;
      console.log(`   📈 Current usage: ${usageData.currentUsage}/${usageData.limit}`);
      console.log(`   ⏰ Remaining uses: ${usageData.remainingUses}`);
      console.log(`   🔓 Can use feature: ${usageData.canUseFeature ? 'Yes' : 'No'}`);
      
      return true;
    } else {
      console.log('   ❌ Usage tracking failed');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Usage tracking test failed');
    if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

// Print final test summary
function printTestSummary() {
  console.log('\n📊 FINAL TEST RESULTS');
  console.log('='.repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;
  
  console.log('\n🖥️  SERVER STATUS');
  console.log(`   Server Running: ${testResults.server.running ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n📺 YOUTUBE FUNCTIONALITY');
  totalTests++;
  if (testResults.youtube.extraction) {
    passedTests++;
    console.log('   ✅ YouTube transcript extraction: WORKING');
  } else {
    console.log('   ❌ YouTube transcript extraction: FAILED');
  }
  
  console.log('\n🖼️  OCR FUNCTIONALITY');
  totalTests++;
  if (testResults.ocr.processing) {
    passedTests++;
    console.log('   ✅ Image OCR processing: WORKING');
  } else {
    console.log('   ⚠️  Image OCR processing: NOT TESTED (no test image)');
  }
  
  console.log('\n🔗 AUTO CREATE WORKFLOW');
  totalTests++;
  if (testResults.autoCreate.workflow) {
    passedTests++;
    console.log('   ✅ Full auto-create pipeline: WORKING');
  } else {
    console.log('   ❌ Full auto-create pipeline: FAILED');
  }
  
  console.log('\n🎯 SUMMARY');
  console.log('-'.repeat(30));
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
  
  if (!testResults.server.running) {
    console.log('\n🚨 CRITICAL: Server not running');
    console.log('   Please start the development server with: npm run dev');
    console.log('   Then re-run this test script');
  } else if (passedTests === totalTests) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('   ✅ YouTube API integration working');
    console.log('   ✅ OCR processing functional');
    console.log('   ✅ Auto Create Quiz pipeline ready');
    console.log('   ✅ Users can generate quizzes from various content sources');
  } else if (passedTests >= totalTests * 0.5) {
    console.log('\n⚠️  PARTIALLY FUNCTIONAL');
    console.log('   ✅ Core systems are working');
    console.log('   ❌ Some features may have limitations');
  } else {
    console.log('\n🚨 MULTIPLE ISSUES DETECTED');
    console.log('   ❌ Auto Create Quiz functionality is severely limited');
    console.log('   📝 Check server logs for detailed error information');
  }
  
  console.log('\n📋 HOW TO TEST MANUALLY:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit: http://localhost:5000/auto-create');
  console.log('3. Try uploading an image file for OCR');
  console.log('4. Try pasting a YouTube video URL');
  console.log('5. Try describing a topic for question generation');
  console.log('6. Verify questions are generated and can be edited');
}

// Main test execution
async function runAPITests() {
  console.log('🚀 Starting Auto Create Quiz API tests...\n');
  
  try {
    // Check if server is running first
    await checkServer();
    
    if (testResults.server.running) {
      // Run functionality tests
      await testAIHealth();
      await testUsageLimits();
      await testYouTubeIntegration();
      await testOCRProcessing();
      await testAutoCreateWorkflow();
    }
    
    // Print summary regardless of server status
    printTestSummary();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Execute tests
runAPITests().catch(console.error);
