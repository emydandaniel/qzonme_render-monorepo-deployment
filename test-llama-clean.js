// Simple test for Meta Llama Vision integration

async function testLlamaVision() {
  console.log('🦙 Testing Meta Llama Vision integration...');
  
  // Use API key directly for testing
  const API_KEY = "44f3465746151ba0fbb3f85b71d00bf93424dd0249870367eb0e0e039018b22c";
  
  console.log('✅ API Key loaded:', API_KEY.substring(0, 10) + '...');
  
  // Test basic text generation
  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
        messages: [
          {
            role: 'user',
            content: 'Generate exactly 1 multiple-choice question about the capital of France. Return ONLY a JSON array with this format: [{"question": "What is the capital of France?", "options": ["A option", "B option", "C option", "D option"], "correctAnswer": "A", "explanation": "Brief explanation", "topic": "Geography"}]'
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ API Response received:', JSON.stringify(result, null, 2));
    
    if (result.choices && result.choices[0] && result.choices[0].message) {
      const content = result.choices[0].message.content;
      console.log('🦙 Generated content:', content);
      
      // Try to parse as JSON
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully parsed questions:', questions);
          console.log('🎉 Meta Llama Vision test PASSED!');
        } else {
          console.log('⚠️ Response not in expected JSON format');
        }
      } catch (parseError) {
        console.log('⚠️ Failed to parse JSON response:', parseError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLlamaVision();
