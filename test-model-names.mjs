import fs from 'fs';
import fetch from 'node-fetch';

// Read API key from .env file
const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/TOGETHER_AI_API_KEY\s*=\s*"?([^"\n\r]+)"?/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;

async function testModel(modelName) {
    console.log(`\n🧪 Testing model: ${modelName}`);
    
    try {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content: 'Say "Test successful" for model validation.'
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            })
        });

        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error: ${errorText}`);
            return false;
        }

        const data = await response.json();
        console.log(`✅ Success: ${data.choices[0].message.content}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Network Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('Testing DeepSeek R1 model names...');
    
    const models = [
        'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
        'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
        'deepseek-ai/deepseek-r1-distill-llama-70b',
        'deepseek-ai/DeepSeek-R1-Distill-70B'
    ];
    
    for (const model of models) {
        const success = await testModel(model);
        if (success) {
            console.log(`\n🎯 CORRECT MODEL NAME: ${model}`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
}

main();
