// Final API test for production readiness
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyD9l332p5annS-Y86x9-DsonWxdh_SfxYw';

console.log('🧪 Final API Tests for Production\n');

// Test 1: Google AI Studio (Gemini) - Most critical
async function testGeminiAI() {
  console.log('🤖 Testing Google AI Studio (Gemini)...');
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Generate exactly 2 multiple-choice questions about basic math.

Requirements:
- Each question should have exactly 4 options labeled A, B, C, D
- Indicate which option is correct (A, B, C, or D)
- Make questions clear and unambiguous

Return ONLY valid JSON in this exact format:
[
  {
    "question": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "B"
  }
]`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('   ✅ Gemini AI responded successfully');
    console.log(`   📝 Response length: ${response.length} characters`);
    
    // Try to parse the JSON
    let cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
    const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }
    
    const questions = JSON.parse(cleanResponse);
    console.log(`   ✅ Generated ${questions.length} valid questions`);
    console.log(`   📝 Sample: "${questions[0].question}"`);
    
    return { success: true, service: 'Google AI Studio (Gemini)' };
    
  } catch (error) {
    console.log(`   ❌ Gemini AI test failed: ${error.message}`);
    return { success: false, service: 'Google AI Studio (Gemini)', error: error.message };
  }
}

// Test 2: YouTube API (for transcript extraction)
async function testYouTubeAPI() {
  console.log('\n📺 Testing YouTube Data API...');
  
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: API_KEY
    });

    // Test with a known educational video
    const videoId = 'dQw4w9WgXcQ';
    
    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId]
    });

    if (videoResponse.data.items && videoResponse.data.items.length > 0) {
      const video = videoResponse.data.items[0];
      console.log(`   ✅ Video found: "${video.snippet.title}"`);
      console.log(`   📝 Description available: ${video.snippet.description ? 'Yes' : 'No'}`);
      
      return { success: true, service: 'YouTube Data API' };
    } else {
      throw new Error('Video not found');
    }

  } catch (error) {
    console.log(`   ❌ YouTube API test failed: ${error.message}`);
    return { success: false, service: 'YouTube Data API', error: error.message };
  }
}

// Test 3: Basic web scraping (for link content extraction)
async function testWebScraping() {
  console.log('\n🌐 Testing Web Content Extraction...');
  
  try {
    // Test with a simple, reliable webpage
    const testUrl = 'https://httpbin.org/html';
    
    const response = await fetch(testUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`   ✅ Successfully fetched web content`);
    console.log(`   📝 Content length: ${html.length} characters`);
    
    // Basic HTML parsing test
    if (html.includes('<html>') && html.includes('</html>')) {
      console.log('   ✅ Valid HTML structure detected');
    }
    
    return { success: true, service: 'Web Content Extraction' };
    
  } catch (error) {
    console.log(`   ❌ Web scraping test failed: ${error.message}`);
    return { success: false, service: 'Web Content Extraction', error: error.message };
  }
}

// Run all critical tests
async function runCriticalTests() {
  console.log('🚀 Running Critical API Tests for Production');
  console.log('='.repeat(50));

  const results = [];

  // Test Gemini AI (most critical)
  const geminiResult = await testGeminiAI();
  results.push(geminiResult);

  // Test YouTube API
  const youtubeResult = await testYouTubeAPI();
  results.push(youtubeResult);

  // Test Web Scraping
  const webResult = await testWebScraping();
  results.push(webResult);

  // Summary
  console.log('\n📊 Production Readiness Summary');
  console.log('='.repeat(50));

  let passedTests = 0;
  let criticalPassed = 0;
  const totalTests = results.length;

  results.forEach((result, index) => {
    const status = result.success ? '✅ READY' : '❌ NEEDS ATTENTION';
    console.log(`${status} ${result.service}`);
    
    if (!result.success && result.error) {
      console.log(`     Issue: ${result.error}`);
    }
    
    if (result.success) {
      passedTests++;
      if (index === 0) criticalPassed++; // Gemini is critical
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`📈 Overall: ${passedTests}/${totalTests} services ready`);

  if (criticalPassed > 0) {
    console.log('🎉 CRITICAL SERVICE (Gemini AI) is working!');
    console.log('✅ Auto Create Quiz core functionality will work.');
    
    if (passedTests >= 2) {
      console.log('🚀 App is READY for production deployment!');
    } else {
      console.log('⚠️  Some optional features may have limited functionality.');
    }
  } else {
    console.log('🚨 CRITICAL ISSUE: Gemini AI is not working!');
    console.log('❌ Auto Create Quiz will not function without this.');
  }

  return results;
}

// Run the tests
runCriticalTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});