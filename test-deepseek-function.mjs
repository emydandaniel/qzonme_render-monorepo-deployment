import { generateQuestionsWithDeepSeekR1 } from './server/services/llamaTextService.js';

async function testDeepSeekFunction() {
    console.log('Testing DeepSeek function directly...');
    
    try {
        const request = {
            content: 'Biology is the study of living organisms.',
            numberOfQuestions: 2,
            difficulty: 'medium',
            language: 'en'
        };
        
        console.log('Calling generateQuestionsWithDeepSeekR1...');
        const result = await generateQuestionsWithDeepSeekR1(request);
        
        console.log('Function result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('Function error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testDeepSeekFunction();
