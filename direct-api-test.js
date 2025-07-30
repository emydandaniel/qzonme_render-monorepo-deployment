import fetch from 'node-fetch';

console.log('🧪 Testing Meta Llama Vision API directly...');

const testDirectAPI = async () => {
  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 44f3465746151ba0fbb3f85b71d00bf93424dd0249870367eb0e0e039018b22c`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-Vision-Free",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Generate exactly 2 quiz questions about Paris, France. Return only a JSON array with this format: [{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswer\": \"A\", \"explanation\": \"...\"}]" }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Meta Llama Vision API Response:', JSON.stringify(data, null, 2));
    
    const content = data.choices[0].message.content;
    console.log('📝 Generated Content:', content);
    
    // Try to parse as JSON with our improved parsing logic
    try {
      let cleanedContent = content.trim();
      // Remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```json\s*|\s*```/g, '');
      cleanedContent = cleanedContent.replace(/```\s*|\s*```/g, ''); // Handle plain code blocks too
      
      const questions = JSON.parse(cleanedContent);
      console.log('🎯 Parsed Questions:', questions);
      console.log(`🎉 Successfully generated ${questions.length} questions!`);
      
      // Show formatted questions
      questions.forEach((q, i) => {
        console.log(`\n📝 Question ${i + 1}:`);
        console.log(`   Q: ${q.question}`);
        console.log(`   A: ${q.options[0]}`);
        console.log(`   B: ${q.options[1]}`);
        console.log(`   C: ${q.options[2]}`);
        console.log(`   D: ${q.options[3]}`);
        console.log(`   ✓ Correct: ${q.correctAnswer}`);
        console.log(`   💡 Explanation: ${q.explanation}`);
      });
      
    } catch (parseError) {
      console.log('⚠️ Content is not valid JSON, but API call succeeded');
      console.log('Parse Error:', parseError.message);
    }
    
  } catch (error) {
    console.error('❌ Direct API test failed:', error);
  }
};

testDirectAPI();
