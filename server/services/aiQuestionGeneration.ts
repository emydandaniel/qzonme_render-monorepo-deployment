import { GoogleGenerativeAI } from '@google/generative-ai';
import { AUTO_CREATE_SERVER_CONFIG } from '../config/autoCreate';
import { AUTO_CREATE_CONFIG, DifficultyLevel, SupportedLanguage } from '@shared/autoCreateConfig';

export interface QuestionGenerationRequest {
  content: string;
  numberOfQuestions: number;
  difficulty: DifficultyLevel;
  language: SupportedLanguage;
  contentType?: 'document' | 'youtube' | 'topic' | 'mixed';
  contentQuality?: number;
}

export interface GeneratedQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: string; // Should be one of the options (A, B, C, or D)
  explanation?: string;
  difficulty: DifficultyLevel;
  topic?: string;
}

export interface QuestionGenerationResult {
  success: boolean;
  questions: GeneratedQuestion[];
  metadata: {
    requestedCount: number;
    generatedCount: number;
    processingTime: number;
    aiModel: string;
    contentLength: number;
    difficulty: DifficultyLevel;
    language: SupportedLanguage;
    qualityScore: number;
    error?: string;
  };
}

/**
 * Smart AI question generation with automatic model selection
 * Primary: Gemini (1500 free requests/day, better for large content)
 * Fallback: Meta Llama 3.3 70B Instruct Turbo Free (unlimited free backup)
 */
export async function generateQuestions(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  console.log('🤖 Starting AI question generation with smart model selection...');
  
  // Try Gemini first (better for PDFs and large content)
  try {
    console.log('� Attempting Gemini (primary choice for free tier)...');
    const result = await generateQuestionsWithGemini(request);
    
    if (result.success && result.questions.length > 0) {
      console.log(`✅ Gemini succeeded: ${result.questions.length} questions generated`);
      return result;
    }
    
    console.warn('⚠️ Gemini failed or returned no questions, falling back to Meta Llama 3.3...');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('⚠️ Gemini error, falling back to Meta Llama 3.3:', errorMessage);
    
    // Check if it's a quota exceeded error
    if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.log('📊 Gemini daily quota likely exhausted, using Meta Llama 3.3 as unlimited backup...');
    }
  }
  
  // Fallback to DeepSeek R1 Distill 70B (free with better reasoning)
  console.log('🚀 Using DeepSeek R1 Distill 70B as fallback...');
  try {
    const { generateQuestionsWithDeepSeekR1 } = await import('./llamaTextService');
    const result = await generateQuestionsWithDeepSeekR1(request);
    
    if (result.success) {
      // Mark as fallback
      result.metadata = {
        ...result.metadata,
        aiModel: result.metadata.aiModel + ' (fallback from gemini)',
        fallbackUsed: true
      } as any;
    }
    
    return result;
  } catch (fallbackError) {
    console.error('Both Gemini and Meta Llama 3.3 failed:', fallbackError);
    
    return {
      success: false,
      questions: [],
      metadata: {
        requestedCount: request.numberOfQuestions,
        generatedCount: 0,
        processingTime: 0,
        aiModel: 'failed (both gemini and llama-3.3-70b)',
        contentLength: request.content?.length || 0,
        difficulty: request.difficulty,
        language: request.language,
        qualityScore: 0,
        error: 'Both AI services failed'
      }
    };
  }
}

/**
 * Generate quiz questions using Google AI Studio (Gemini) - Fallback method
 */
export async function generateQuestionsWithGemini(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  const startTime = Date.now();
  
  try {
    // Validate request
    const validation = validateGenerationRequest(request);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Initialize Google AI
    // Check for Google AI API key - use process.env directly to avoid timing issues
    const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI Studio API key not configured');
    }

    console.log(`🤖 Using Google AI with API key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Enhanced model configuration for more creative and diverse generation
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.8, // Increased for more creativity
        topP: 0.9,
        topK: 50, // Add diversity in token selection
        maxOutputTokens: 4000,
        responseMimeType: "text/plain"
      }
    });
    
    // Create the enhanced prompt
    const enhancedRequest = enhanceGeminiContentForDiversity(request);
    const prompt = createQuestionGenerationPrompt(enhancedRequest);
    
    // Generate content with retry logic
    let result;
    let attempts = 0;
    const maxAttempts = AUTO_CREATE_SERVER_CONFIG.MAX_RETRIES;
    
    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        
        console.warn(`AI generation attempt ${attempts} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
      }
    }
    
    if (!result) {
      throw new Error('Failed to generate content after multiple attempts');
    }
    
    // Parse the response
    const responseText = result.response.text();
    const questions = parseAIResponse(responseText, request.difficulty);
    
    // Validate generated questions
    const validQuestions = questions.filter(q => validateGeneratedQuestion(q));
    
    // Calculate quality score
    const qualityScore = calculateGenerationQuality(validQuestions, request);
    
    return {
      success: true,
      questions: validQuestions,
      metadata: {
        requestedCount: request.numberOfQuestions,
        generatedCount: validQuestions.length,
        processingTime: Date.now() - startTime,
        aiModel: 'gemini-1.5-pro',
        contentLength: request.content.length,
        difficulty: request.difficulty,
        language: request.language,
        qualityScore
      }
    };
    
  } catch (error) {
    console.error('Question generation error:', error);
    
    return {
      success: false,
      questions: [],
      metadata: {
        requestedCount: request.numberOfQuestions,
        generatedCount: 0,
        processingTime: Date.now() - startTime,
        aiModel: 'gemini-1.5-pro',
        contentLength: request.content.length,
        difficulty: request.difficulty,
        language: request.language,
        qualityScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Create the prompt for AI question generation (Enhanced with creativity)
 */
function createQuestionGenerationPrompt(request: QuestionGenerationRequest): string {
  const { content, numberOfQuestions, difficulty, language, contentType } = request;
  
  const difficultyInstructions = {
    Easy: 'Focus on basic facts, definitions, and simple recall. Questions should be straightforward with obvious correct answers.',
    Medium: 'Include some analysis and application questions. Mix factual recall with understanding and basic reasoning.',
    Hard: 'Emphasize critical thinking, analysis, synthesis, and complex reasoning. Include questions that require deeper understanding.'
  };
  
  const languageInstruction = language === 'English' ? '' : `Generate all questions and answers in ${language}. `;
  
  const contentTypeHint = contentType ? getContentTypeHint(contentType) : '';
  
  // Add creativity and diversity elements
  const creativityInstructions = generateGeminiCreativityInstructions(request);
  const questionTypes = getGeminiRandomQuestionTypes(numberOfQuestions);
  const diversityPrompt = generateGeminiDiversityPrompt();
  
  return `You are an expert quiz creator specializing in DIVERSE and CREATIVE question generation. ${languageInstruction}Generate exactly ${numberOfQuestions} unique, varied, and engaging multiple-choice questions based on the following content.

CREATIVITY & DIVERSITY REQUIREMENTS:
${creativityInstructions}
${questionTypes}
${diversityPrompt}

DIFFICULTY LEVEL: ${difficulty}
${difficultyInstructions[difficulty]}

CONTENT TYPE: ${contentType || 'Mixed'}
${contentTypeHint}

REQUIREMENTS:
1. Each question must have exactly 4 options labeled A, B, C, D
2. Only one option should be correct
3. Questions should be clear, unambiguous, and well-written
4. Avoid questions that are too obvious or too obscure
5. Include a mix of question types (factual, analytical, application)
6. Make incorrect options plausible but clearly wrong
7. Ensure questions test understanding, not just memorization
8. AVOID repetitive patterns - make each question unique in style and approach
9. Use different question starters and phrasings for maximum variety
10. CRITICAL: RANDOMIZE THE CORRECT ANSWERS! ABSOLUTELY NO PATTERNS ALLOWED!
   - Mix correct answers randomly across A, B, C, D options
   - NEVER make the first question's answer A
   - NEVER make consecutive questions have the same correct answer
   - Randomly shuffle where the correct answer appears (A, B, C, or D)
   - Each question's correct answer position must be independent and random

FORMAT: Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Your question here?",
    "options": ["First option text", "Second option text", "Third option text", "Fourth option text"],
    "correctAnswer": "A",
    "explanation": "Brief explanation of why this is correct",
    "topic": "Main topic/subject of the question"
  }
]

IMPORTANT: Do NOT include A), B), C), D) prefixes in the option text. Only provide the actual option content.

CONTENT TO BASE QUESTIONS ON:
${content}

Generate exactly ${numberOfQuestions} UNIQUE and DIVERSE questions now:`;
}

/**
 * Get content type specific hints for better question generation
 */
function getContentTypeHint(contentType: string): string {
  const hints = {
    document: 'This is from a document. Focus on key concepts, definitions, and main ideas presented in the text.',
    youtube: 'This is from a video transcript. Focus on the key points, explanations, and demonstrations discussed.',
    topic: 'This is a topic description. Create questions that test general knowledge about this subject.',
    mixed: 'This content comes from multiple sources. Create diverse questions covering different aspects.'
  };
  
  return hints[contentType as keyof typeof hints] || '';
}

/**
 * Generate creativity instructions for more diverse questions (Gemini version)
 */
function generateGeminiCreativityInstructions(request: QuestionGenerationRequest): string {
  const creativityElements = [
    'Think beyond basic definitions - explore applications, implications, and connections',
    'Consider historical context, modern applications, and future implications',
    'Include cause-and-effect relationships, comparisons, and analytical scenarios',
    'Explore different perspectives, debates, and controversial aspects when appropriate',
    'Use real-world examples, case studies, and practical applications',
    'Consider interdisciplinary connections and cross-topic relationships'
  ];
  
  const randomElements = creativityElements
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .join('. ');
  
  return `CREATIVITY FOCUS: ${randomElements}.`;
}

/**
 * Generate random question types for variety (Gemini version)
 */
function getGeminiRandomQuestionTypes(numberOfQuestions: number): string {
  const questionTemplates = [
    'factual recall',
    'analytical comparison', 
    'cause-and-effect analysis',
    'application scenario',
    'problem-solving situation',
    'conceptual understanding',
    'critical evaluation',
    'synthesis and integration',
    'real-world application',
    'historical context',
    'future implications',
    'interdisciplinary connections'
  ];
  
  const selectedTypes = questionTemplates
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(numberOfQuestions, 6));
  
  return `QUESTION TYPE VARIETY: Include these types: ${selectedTypes.join(', ')}.`;
}

/**
 * Generate diversity prompt with randomization (Gemini version)
 */
function generateGeminiDiversityPrompt(): string {
  const diversityElements = [
    'Avoid repetitive question patterns or similar phrasings',
    'Use varied question starters (What, How, Why, Which, Where, When)',
    'Mix direct questions with scenario-based problems',
    'Include both specific details and broader conceptual understanding',
    'Vary the complexity and depth of each question within the difficulty level'
  ];
  
  const randomElement = diversityElements[Math.floor(Math.random() * diversityElements.length)];
  const timestamp = Date.now();
  
  return `DIVERSITY REQUIREMENT: ${randomElement}. [Seed: ${timestamp % 10000}]`;
}

/**
 * Enhance content for better diversity, especially for short topics (Gemini version)
 */
function enhanceGeminiContentForDiversity(request: QuestionGenerationRequest): QuestionGenerationRequest {
  const { content, contentType } = request;
  
  // If content is very short (likely a topic), expand it to encourage diverse questions
  if (content.length < 100 && contentType === 'topic') {
    const expandedContent = `${content}: This topic encompasses various aspects including basic concepts, historical development, practical applications, modern innovations, scientific principles, real-world examples, related technologies, current research, future implications, and interdisciplinary connections. Consider multiple perspectives, different scales of analysis, and both theoretical and practical dimensions when creating questions.`;
    
    console.log(`📝 Expanded short topic "${content}" for enhanced Gemini diversity`);
    
    return {
      ...request,
      content: expandedContent
    };
  }
  
  return request;
}

/**
 * Parse AI response and extract questions
 */
function parseAIResponse(responseText: string, difficulty: DifficultyLevel): GeneratedQuestion[] {
  try {
    // Clean up the response text
    let cleanedText = responseText.trim();
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*|\s*```/g, '');
    
    // Find JSON array in the response
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response');
    }
    
    const jsonText = jsonMatch[0];
    const parsedQuestions = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedQuestions)) {
      throw new Error('AI response is not an array');
    }
    
    // Convert to our format and add difficulty
    const convertedQuestions = parsedQuestions.map((q: any) => {
      // Clean up options to remove ALL listing indicators (A), B), C), D) and A., B., C., D. prefixes
      const cleanedOptions = Array.isArray(q.options) && q.options.length === 4 
        ? q.options.map((option: string) => {
            if (typeof option === 'string') {
              // Remove multiple patterns of listing indicators and trim
              return option
                .replace(/^[A-D]\)\s*/, '') // Remove A), B), C), D) prefixes
                .replace(/^[A-D]\.\s*/, '') // Remove A., B., C., D. prefixes  
                .replace(/^[A-D]\s*[-:]\s*/, '') // Remove A -, B :, etc. prefixes
                .replace(/^[A-D]\s+/, '') // Remove standalone A, B, C, D followed by space
                .trim();
            }
            return option;
          })
        : ['', '', '', ''];

      return {
        question: q.question || '',
        options: [cleanedOptions[0], cleanedOptions[1], cleanedOptions[2], cleanedOptions[3]] as [string, string, string, string],
        correctAnswer: q.correctAnswer || 'A',
        explanation: q.explanation || '',
        difficulty,
        topic: q.topic || ''
      };
    });
    
    // Ensure answer distribution variety as a safety measure
    return ensureAnswerVariety(convertedQuestions);
    
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.log('Raw response:', responseText);
    
    // Try to extract questions manually as fallback
    return extractQuestionsManually(responseText, difficulty);
  }
}

/**
 * Fallback method to extract questions manually from AI response
 */
function extractQuestionsManually(responseText: string, difficulty: DifficultyLevel): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  try {
    // Look for question patterns in the text
    const questionPattern = /(?:Question \d+:|^\d+\.|\*\*Question\*\*:?)\s*(.+?)\?/gim;
    const matches = responseText.match(questionPattern);
    
    if (matches) {
      matches.forEach((match, index) => {
        // This is a very basic fallback - in practice, you'd need more sophisticated parsing
        const questionText = match.replace(/(?:Question \d+:|^\d+\.|\*\*Question\*\*:?)\s*/i, '').trim();
        
        questions.push({
          question: questionText,
          options: ['Option A', 'Option B', 'Option C', 'Option D'] as [string, string, string, string],
          correctAnswer: 'A',
          explanation: 'Generated from fallback parsing',
          difficulty,
          topic: 'General'
        });
      });
    }
  } catch (error) {
    console.error('Manual extraction failed:', error);
  }
  
  return questions;
}

/**
 * Validate a generated question
 */
function validateGeneratedQuestion(question: GeneratedQuestion): boolean {
  const rules = AUTO_CREATE_CONFIG.QUESTION_VALIDATION_RULES;
  
  // Check question text
  if (!question.question || 
      question.question.length < rules.MIN_QUESTION_LENGTH || 
      question.question.length > rules.MAX_QUESTION_LENGTH) {
    return false;
  }
  
  // Check options
  if (!Array.isArray(question.options) || question.options.length !== rules.REQUIRED_OPTIONS_COUNT) {
    return false;
  }
  
  // Check each option
  for (const option of question.options) {
    if (!option || 
        option.length < rules.MIN_OPTION_LENGTH || 
        option.length > rules.MAX_OPTION_LENGTH) {
      return false;
    }
  }
  
  // Check correct answer
  if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
    return false;
  }
  
  // Check that correct answer corresponds to an actual option
  const correctIndex = question.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
  if (correctIndex < 0 || correctIndex >= question.options.length) {
    return false;
  }
  
  return true;
}

/**
 * Calculate quality score for generated questions
 */
function calculateGenerationQuality(questions: GeneratedQuestion[], request: QuestionGenerationRequest): number {
  if (questions.length === 0) return 0;
  
  let qualityScore = 10;
  
  // Quantity score (did we get the requested number?)
  const completionRatio = questions.length / request.numberOfQuestions;
  if (completionRatio < 0.5) qualityScore -= 4;
  else if (completionRatio < 0.8) qualityScore -= 2;
  else if (completionRatio < 1.0) qualityScore -= 1;
  
  // Quality of individual questions
  let totalQuestionQuality = 0;
  questions.forEach(question => {
    let questionQuality = 10;
    
    // Question length and clarity
    if (question.question.length < 20) questionQuality -= 2;
    if (!question.question.includes('?')) questionQuality -= 1;
    
    // Option quality
    const optionLengths = question.options.map(opt => opt.length);
    const avgOptionLength = optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length;
    if (avgOptionLength < 5) questionQuality -= 2;
    
    // Check for duplicate options
    const uniqueOptions = new Set(question.options);
    if (uniqueOptions.size < 4) questionQuality -= 3;
    
    totalQuestionQuality += Math.max(1, questionQuality);
  });
  
  const avgQuestionQuality = totalQuestionQuality / questions.length;
  qualityScore = (qualityScore + avgQuestionQuality) / 2;
  
  return Math.max(1, Math.min(10, Math.round(qualityScore)));
}

/**
 * Validate generation request
 */
function validateGenerationRequest(request: QuestionGenerationRequest): { valid: boolean; error?: string } {
  // More lenient validation for topic-based content generation
  if (!request.content || request.content.trim().length < 3) {
    return { valid: false, error: 'Content too short for question generation (minimum 3 characters)' };
  }
  
  if (request.content.length > 50000) {
    return { valid: false, error: 'Content too long for processing' };
  }
  
  if (request.numberOfQuestions < AUTO_CREATE_CONFIG.MIN_QUESTIONS || 
      request.numberOfQuestions > AUTO_CREATE_CONFIG.MAX_QUESTIONS) {
    return { valid: false, error: `Number of questions must be between ${AUTO_CREATE_CONFIG.MIN_QUESTIONS} and ${AUTO_CREATE_CONFIG.MAX_QUESTIONS}` };
  }
  
  if (!AUTO_CREATE_CONFIG.DIFFICULTY_LEVELS.includes(request.difficulty)) {
    return { valid: false, error: 'Invalid difficulty level' };
  }
  
  if (!AUTO_CREATE_CONFIG.SUPPORTED_LANGUAGES.includes(request.language)) {
    return { valid: false, error: 'Unsupported language' };
  }
  
  return { valid: true };
}

/**
 * Generate a preview of questions (fewer questions for quick feedback)
 */
export async function generateQuestionPreview(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  const previewRequest = {
    ...request,
    numberOfQuestions: Math.max(5, Math.min(request.numberOfQuestions, 10)) // Generate 5-10 questions for preview
  };
  
  return generateQuestions(previewRequest);
}

/**
 * Regenerate questions with different parameters
 */
export async function regenerateQuestions(
  originalRequest: QuestionGenerationRequest,
  regenerationOptions: {
    difficulty?: DifficultyLevel;
    numberOfQuestions?: number;
    focusAreas?: string[];
  }
): Promise<QuestionGenerationResult> {
  const newRequest = {
    ...originalRequest,
    difficulty: regenerationOptions.difficulty || originalRequest.difficulty,
    numberOfQuestions: regenerationOptions.numberOfQuestions || originalRequest.numberOfQuestions
  };
  
  // If focus areas are specified, modify the content to emphasize those areas
  if (regenerationOptions.focusAreas && regenerationOptions.focusAreas.length > 0) {
    const focusInstruction = `Focus particularly on these areas: ${regenerationOptions.focusAreas.join(', ')}. `;
    newRequest.content = focusInstruction + newRequest.content;
  }
  
  return generateQuestions(newRequest);
}

/**
 * Ensure that correct answers are distributed across A, B, C, D options
 * This prevents all questions from having the same correct answer
 */
function ensureAnswerVariety(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  if (questions.length === 0) return questions;
  
  // ALWAYS redistribute to eliminate patterns - force aggressive randomization
  console.log(`🔄 FORCING complete answer redistribution to eliminate ALL patterns...`);
  
  // Create a truly random distribution with aggressive anti-pattern logic
  const answerOptions = ['B', 'C', 'D']; // Exclude A from initial pool to prevent first=A
  const shuffledAnswers: string[] = [];
  
  // Generate completely random answers for each question with strict anti-pattern rules
  for (let i = 0; i < questions.length; i++) {
    let randomAnswer: string;
    
    if (i === 0) {
      // ABSOLUTELY NEVER start with A for the first question
      randomAnswer = answerOptions[Math.floor(Math.random() * 3)]; // B, C, or D only
      console.log(`🚫 Question 1: FORCED to be non-A, selected ${randomAnswer}`);
    } else {
      // For subsequent questions, apply multiple anti-pattern rules
      const fullOptions = ['A', 'B', 'C', 'D'];
      let attempts = 0;
      do {
        randomAnswer = fullOptions[Math.floor(Math.random() * 4)];
        attempts++;
      } while (
        (randomAnswer === shuffledAnswers[i - 1] || // No consecutive duplicates
         (i >= 3 && randomAnswer === shuffledAnswers[i - 4]) || // No A-B-C-D pattern
         (i >= 1 && i % 4 === 0 && randomAnswer === 'A') || // No cycling back to A every 4th
         (i >= 1 && i % 4 === 1 && randomAnswer === 'B') || // No cycling pattern
         (i >= 1 && i % 4 === 2 && randomAnswer === 'C') ||
         (i >= 1 && i % 4 === 3 && randomAnswer === 'D') ||
         (i === 1 && randomAnswer === 'A') || // Avoid A in second position too
         (i <= 3 && randomAnswer === 'A' && Math.random() < 0.7)) && // Reduce A probability in first few questions
        attempts < 15
      );
      
      // Fallback if we can't find a good option
      if (attempts >= 15) {
        const availableOptions = fullOptions.filter(opt => 
          opt !== shuffledAnswers[i - 1] && 
          !(i === 0 && opt === 'A') // Never A for first question
        );
        randomAnswer = availableOptions.length > 0 
          ? availableOptions[Math.floor(Math.random() * availableOptions.length)]
          : 'B'; // Safe fallback
      }
      
      console.log(`🎲 Question ${i + 1}: Selected ${randomAnswer} (pattern prevention)`);
    }
    
    shuffledAnswers.push(randomAnswer);
  }
  
  // Additional check - if first question is still A, force change it
  if (shuffledAnswers[0] === 'A') {
    shuffledAnswers[0] = ['B', 'C', 'D'][Math.floor(Math.random() * 3)];
    console.log(`🔄 EMERGENCY: Changed first question from A to ${shuffledAnswers[0]}`);
  }
  
  // Final verification and logging
  console.log(`✅ Final answer sequence: ${shuffledAnswers.join(' → ')}`);
  
  return questions.map((question, index) => {
    const newCorrectAnswer = shuffledAnswers[index];
    
    if (newCorrectAnswer === question.correctAnswer) {
      // Already correct, no change needed
      console.log(`✅ Question ${index + 1}: Answer ${newCorrectAnswer} already correct`);
      return question;
    }
    
    // Find the current correct option and the target option
    const currentCorrectIndex = question.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
    const newCorrectIndex = newCorrectAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
    
    // Ensure indices are valid
    if (currentCorrectIndex < 0 || currentCorrectIndex >= 4 || newCorrectIndex < 0 || newCorrectIndex >= 4) {
      console.warn(`Invalid answer index: current=${currentCorrectIndex}, new=${newCorrectIndex}`);
      return question; // Return unchanged if invalid
    }
    
    // Swap the options to maintain correctness
    const newOptions = [...question.options] as [string, string, string, string];
    const temp = newOptions[currentCorrectIndex];
    newOptions[currentCorrectIndex] = newOptions[newCorrectIndex];
    newOptions[newCorrectIndex] = temp;
    
    return {
      ...question,
      options: newOptions,
      correctAnswer: newCorrectAnswer
    };
  });
}