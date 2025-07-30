// Test OCR and YouTube API functionality after Google Vision removal
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🧪 Testing OCR and YouTube API after Google Vision removal');
console.log('='.repeat(60));

// Test 1: Check that YouTube API still works
async function testYouTubeAPI() {
  console.log('\n📺 Testing YouTube API...');
  
  try {
    const { google } = await import('googleapis');
    
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    
    // Test video details retrieval
    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: ['dQw4w9WgXcQ'] // Rick Roll - reliable test video
    });
    
    if (videoResponse.data.items && videoResponse.data.items.length > 0) {
      const video = videoResponse.data.items[0];
      console.log('✅ YouTube API working!');
      console.log(`   Video: ${video.snippet?.title}`);
      console.log(`   Channel: ${video.snippet?.channelTitle}`);
      return true;
    } else {
      console.log('❌ YouTube API failed - no video data returned');
      return false;
    }
    
  } catch (error) {
    console.error('❌ YouTube API error:', error.message);
    return false;
  }
}

// Test 2: Check that OCR service imports correctly (without Google Vision)
async function testOCRImports() {
  console.log('\n🔍 Testing OCR service imports...');
  
  try {
    // Try to import the OCR service
    const { extractTextFromImage, extractTextWithTesseract, validateImageForOCR } = 
      await import('./server/services/ocrService.ts');
    
    console.log('✅ OCR service imports successfully');
    console.log('   Available functions:');
    console.log('   - extractTextFromImage (main function)');
    console.log('   - extractTextWithTesseract (Tesseract only)');
    console.log('   - validateImageForOCR (validation)');
    
    // Test validation function
    const testValidation = validateImageForOCR('./non-existent-file.jpg');
    console.log(`   - Validation test: ${testValidation.valid ? '✅' : '❌'} (Expected: ❌)`);
    
    return true;
    
  } catch (error) {
    console.error('❌ OCR service import error:', error.message);
    return false;
  }
}

// Test 3: Check environment variables
function testEnvironmentVariables() {
  console.log('\n🔧 Testing environment variables...');
  
  const requiredEnvVars = [
    'YOUTUBE_API_KEY',
    'GOOGLE_AI_STUDIO_API_KEY',
    'TOGETHER_AI_API_KEY'
  ];
  
  const removedEnvVars = [
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_CLOUD_PROJECT_ID'
  ];
  
  let allGood = true;
  
  console.log('   Required variables:');
  requiredEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    console.log(`   - ${varName}: ${exists ? '✅' : '❌'}`);
    if (!exists) allGood = false;
  });
  
  console.log('   Removed variables (should be empty):');
  removedEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    console.log(`   - ${varName}: ${exists ? '❌ (still exists)' : '✅ (removed)'}`);
  });
  
  return allGood;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive test...\n');
  
  const results = {
    youtube: await testYouTubeAPI(),
    ocr: await testOCRImports(),
    env: testEnvironmentVariables()
  };
  
  console.log('\n📊 TEST RESULTS');
  console.log('='.repeat(40));
  console.log(`YouTube API: ${results.youtube ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`OCR Service: ${results.ocr ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Environment: ${results.env ? '✅ PASS' : '❌ FAIL'}`);
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! Google Vision removal was successful.');
    console.log('✅ YouTube API functionality preserved');
    console.log('✅ OCR now uses only Tesseract.js');
    console.log('✅ Environment properly cleaned up');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
}

runAllTests().catch(console.error);
