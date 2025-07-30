import fs from 'fs';
import fetch from 'node-fetch';

// Read API key from .env file
const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/TOGETHER_AI_API_KEY\s*=\s*"?([^"\n\r]+)"?/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;

console.log(`Testing DeepSeek R1 API with key: ${API_KEY ? API_KEY.substring(0, 8) + '...' + API_KEY.slice(-4) : 'NOT FOUND'}`);

if (!API_KEY) {
    console.error('❌ TOGETHER_AI_API_KEY not found in .env file');
    process.exit(1);
}

async function testDeepSeekR1() {
    try {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
                messages: [
                    {
                        role: 'user',
                        content: 'Generate 3 simple biology quiz questions. Answer with just the questions, no other text.'
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error: ${errorText}`);
            return;
        }

        const data = await response.json();
        console.log('✅ DeepSeek R1 API Response:');
        console.log(JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
}

testDeepSeekR1();
