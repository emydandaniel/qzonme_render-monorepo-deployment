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
 * Generate quiz questions using DeepSeek R1 Distill Llama 70B Free
 * This is the new primary AI service for text-based question generation
 * Features advanced reasoning capabilities and multilingual support
 */
export async function generateQuestionsWithDeepSeekR1(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  const startTime = Date.now();
  
  try {
    // Validate request first
    const validation = validateGenerationRequest(request);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check for Together.ai API key
    if (!process.env.TOGETHER_AI_API_KEY) {
      console.error('❌ TOGETHER_AI_API_KEY not found in environment variables');
      throw new Error('Together.ai API key not configured');
    }

    console.log(`🚀 Using DeepSeek R1 Distill Llama 70B - Advanced reasoning model for superior question generation`);
    console.log(`🔑 API Key available: ${process.env.TOGETHER_AI_API_KEY ? 'YES' : 'NO'} (${process.env.TOGETHER_AI_API_KEY?.substring(0, 8)}...)`);
    console.log(`📝 Content length: ${request.content.length} characters`);

    // Enhance short content to encourage more diverse questions
    const enhancedRequest = enhanceContentForDiversity(request);

    // Create the optimized prompt for this model
    const prompt = createOptimizedPrompt(enhancedRequest);

    // Prepare the API request for text-only generation with enhanced creativity
    const apiRequest = {
      model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', // Upgrade to 70B reasoning model
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000, // Increased for 70B model - can handle more complex responses
      temperature: 0.7, // Balanced creativity for reasoning model
      top_p: 0.9,
      top_k: 40, // Optimized for reasoning model
      repetition_penalty: 1.1, // Reduce repetition
      stream: false
    };

    // Make the API call with retry logic
    let result;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`🚀 Making API call to Together.ai (attempt ${attempts + 1}/${maxAttempts})`);
        
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TOGETHER_AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiRequest)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || response.statusText;
          
          // For specific errors, throw them up to be handled by the hybrid service
          if (response.status === 429 || errorMessage.includes('rate limit')) {
            throw new Error(`Rate limit exceeded: ${errorMessage}`);
          }
          
          if (response.status === 422 && errorMessage.includes('tokens')) {
            throw new Error(`Token limit exceeded: ${errorMessage}`);
          }
          
          throw new Error(`Together.ai API error: ${response.status} - ${errorMessage}`);
        }

        result = await response.json();
        console.log('✅ DeepSeek R1 Distill 70B responded successfully');
        break;
        
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check for specific errors and throw them up to be handled by hybrid service
        if (errorMessage.includes('rate limit')) {
          throw new Error(`Rate limit detected: ${errorMessage}`);
        }
        
        if (errorMessage.includes('tokens') || errorMessage.includes('token limit')) {
          throw new Error(`Token limit detected: ${errorMessage}`);
        }
        
        if (attempts >= maxAttempts) throw error;
        
        console.warn(`DeepSeek R1 generation attempt ${attempts} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
      }
    }

    if (!result || !result.choices || !result.choices[0]) {
      throw new Error('Invalid response from Together.ai API');
    }

    // Parse the response
    const responseText = result.choices[0].message.content;
    console.log('🧠 DeepSeek R1 Distill 70B raw response length:', responseText.length);
    
    const questions = parseAIResponse(responseText, request.difficulty);
    console.log(`🔍 DETAILED LOGGING: Parsed ${questions.length} raw questions from AI response`);
    questions.forEach((q, idx) => {
      console.log(`Question ${idx + 1}: "${q.question.substring(0, 50)}..." - Valid: ${validateGeneratedQuestion(q)}`);
    });
    
    // Validate generated questions
    const validQuestions = questions.filter(q => validateGeneratedQuestion(q));
    console.log(`✅ After validation: ${validQuestions.length}/${questions.length} questions passed validation`);
    
    // Calculate quality score
    const qualityScore = calculateGenerationQuality(validQuestions, request);
    
    console.log(`✅ Generated ${validQuestions.length}/${request.numberOfQuestions} valid questions with quality score: ${qualityScore}/10`);
    
    // If we got fewer questions than requested and the difference is just 1-2, try to generate the missing ones
    if (validQuestions.length < request.numberOfQuestions && validQuestions.length >= request.numberOfQuestions - 2) {
      const missing = request.numberOfQuestions - validQuestions.length;
      console.log(`🔄 Attempting to generate ${missing} additional question(s) to meet the requested count...`);
      
      try {
        // Create a smaller request for the missing questions
        const supplementRequest = {
          ...request,
          numberOfQuestions: missing,
          content: request.content.substring(0, 2000) // Use a shorter excerpt to avoid repetition
        };
        
        const supplementResult = await generateQuestionsWithDeepSeekR1(supplementRequest);
        if (supplementResult.success && supplementResult.questions.length > 0) {
          console.log(`✅ Successfully generated ${supplementResult.questions.length} additional question(s)`);
          validQuestions.push(...supplementResult.questions.slice(0, missing));
        }
      } catch (supplementError) {
        console.log('⚠️ Failed to generate supplementary questions:', supplementError);
      }
    }
    
    return {
      success: true,
      questions: validQuestions,
      metadata: {
        requestedCount: request.numberOfQuestions,
        generatedCount: validQuestions.length,
        processingTime: Date.now() - startTime,
        aiModel: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
        contentLength: request.content.length,
        difficulty: request.difficulty,
        language: request.language,
        qualityScore
      }
    };
    
  } catch (error) {
    console.error('DeepSeek R1 question generation error:', error);
    
    return {
      success: false,
      questions: [],
      metadata: {
        requestedCount: request.numberOfQuestions,
        generatedCount: 0,
        processingTime: Date.now() - startTime,
        aiModel: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
        contentLength: request.content?.length || 0,
        difficulty: request.difficulty,
        language: request.language,
        qualityScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Create an optimized prompt specifically for DeepSeek R1 Distill Llama 70B
 * This model excels at reasoning and multilingual tasks
 * Enhanced with creativity and diversity instructions
 */
function createOptimizedPrompt(request: QuestionGenerationRequest): string {
  const { content, numberOfQuestions, difficulty, language, contentType } = request;
  
  const difficultyInstructions = {
    Easy: 'Create straightforward questions focusing on basic facts, simple recall, and obvious concepts. Make correct answers clearly distinguishable.',
    Medium: 'Generate questions requiring moderate analysis and understanding. Mix factual recall with reasoning and application of concepts.',
    Hard: 'Design challenging questions requiring critical thinking, analysis, synthesis, and deep reasoning. Include complex scenarios and nuanced understanding.'
  };
  
  const languageInstruction = language === 'English' ? '' : `IMPORTANT: Generate ALL content (questions, options, explanations) in ${language}. `;
  
  const contentTypeHint = getContentTypeHint(contentType);
  
  // Add creativity and diversity elements
  const creativityInstructions = generateCreativityInstructions(request);
  const questionTypes = getRandomQuestionTypes(numberOfQuestions);
  const diversityPrompt = generateDiversityPrompt();
  
  return `You are an expert quiz creator powered by DeepSeek R1 Distill Llama 70B, an advanced reasoning model. ${languageInstruction}Your task is to create exactly ${numberOfQuestions} high-quality, DIVERSE, and CREATIVE multiple-choice questions based on the provided content.

## REASONING APPROACH
Use your advanced reasoning capabilities to:
- Analyze content depth and extract key concepts
- Create questions that test understanding at multiple cognitive levels
- Design sophisticated incorrect options (distractors) that require reasoning to eliminate
- Apply logical thinking to ensure question quality and educational value

## CONTENT ANALYSIS
${contentTypeHint}

## CREATIVITY & DIVERSITY REQUIREMENTS
${creativityInstructions}
${questionTypes}
${diversityPrompt}

## DIFFICULTY REQUIREMENTS: ${difficulty}
${difficultyInstructions[difficulty]}

## GENERATION RULES
1. Each question must have exactly 4 options
2. Only one option should be correct 
3. All questions must be based on the provided content
4. Make incorrect options plausible but clearly wrong
5. Ensure questions test understanding, not just memorization
6. Vary question types (factual, analytical, application, inference)
7. AVOID repetitive patterns - make each question unique in style and approach
8. Use different question starters and phrasings for variety

## ANSWER DISTRIBUTION (CRITICAL)
Distribute correct answers randomly across A, B, C, D to avoid predictable patterns.
- NEVER make all questions have the same correct answer
- AVOID sequential patterns like A→B→C→D
- Mix answers randomly: A, C, B, D, C, A, B, D, etc.
- Ensure variety so users cannot predict the next answer

## OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown, no explanations, just the JSON:

[
  {
    "question": "Your question text here?",
    "options": ["Clean option without prefixes", "Second option", "Third option", "Fourth option"],
    "correctAnswer": "A",
    "explanation": "Brief explanation why this answer is correct",
    "topic": "Main topic of this question"
  }
]

## CRITICAL FORMATTING RULES
- Do NOT include A), B), C), D) or A., B., C., D. prefixes in options
- Options should be clean text only: ["DNA", "RNA", "Protein", "Lipid"]
- Ensure valid JSON syntax with proper quotes and commas
- Each question object must have all 5 required fields

## CONTENT TO ANALYZE:
${content}

Generate exactly ${numberOfQuestions} UNIQUE and DIVERSE questions now - NO MORE, NO LESS:
CRITICAL: You MUST generate precisely ${numberOfQuestions} complete questions. Do not generate ${numberOfQuestions - 1} or ${numberOfQuestions + 1} questions. Generate exactly ${numberOfQuestions} questions.`;
}

/**
 * Get content type specific hints optimized for Llama 3.3
 */
function getContentTypeHint(contentType?: string): string {
  const hints = {
    document: 'DOCUMENT CONTENT: Focus on key concepts, definitions, and main ideas. Create questions that test comprehension of the written material.',
    youtube: 'VIDEO TRANSCRIPT: Focus on explanations, demonstrations, and key points discussed. Test understanding of the spoken content.',
    topic: 'TOPIC EXPLORATION: Create questions testing general knowledge about this subject. Cover various aspects and applications.',
    mixed: 'MIXED CONTENT: Draw from all provided sources to create diverse questions covering different aspects and perspectives.'
  };
  
  return hints[contentType as keyof typeof hints] || 'GENERAL CONTENT: Analyze all provided information to create comprehensive questions.';
}

/**
 * Generate creativity instructions for more diverse questions
 */
function generateCreativityInstructions(request: QuestionGenerationRequest): string {
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
 * Generate random question types for variety
 */
function getRandomQuestionTypes(numberOfQuestions: number): string {
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
 * Generate diversity prompt with randomization
 */
function generateDiversityPrompt(): string {
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
 * Enhance content for better diversity, especially for short topics
 * Also handles content truncation for large documents
 */
function enhanceContentForDiversity(request: QuestionGenerationRequest): QuestionGenerationRequest {
  const { content, contentType } = request;
  
  // If content is very short (likely a topic), expand it to encourage diverse questions
  if (content.length < 100 && contentType === 'topic') {
    const expandedContent = `${content}: This topic encompasses various aspects including basic concepts, historical development, practical applications, modern innovations, scientific principles, real-world examples, related technologies, current research, future implications, and interdisciplinary connections. Consider multiple perspectives, different scales of analysis, and both theoretical and practical dimensions when creating questions.`;
    
    console.log(`📝 Expanded short topic "${content}" for enhanced diversity`);
    
    return {
      ...request,
      content: expandedContent
    };
  }
  
  // For large content (especially PDFs), intelligently truncate while preserving key information
  if (content.length > 12000) { // Increased limit for 70B model
    console.log(`📄 Large content detected (${content.length} chars), intelligently truncating for 70B model...`);
    
    // For very large content, take first 8000 chars and last 2000 chars
    const firstPart = content.substring(0, 8000);
    const lastPart = content.substring(content.length - 2000);
    const truncatedContent = firstPart + '\n\n[... middle section truncated for processing optimization ...]\n\n' + lastPart;
    
    console.log(`📄 Content intelligently truncated from ${content.length} to ${truncatedContent.length} characters`);
    
    return {
      ...request,
      content: truncatedContent
    };
  }
  
  return request;
}

/**
 * Parse AI response with enhanced error handling for DeepSeek R1
 */
function parseAIResponse(responseText: string, difficulty: DifficultyLevel): GeneratedQuestion[] {
  try {
    // Clean up the response text more aggressively
    let cleanedText = responseText.trim();
    
    // Remove any explanatory text before/after JSON
    const jsonStart = cleanedText.indexOf('[');
    const jsonEnd = cleanedText.lastIndexOf(']');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*|\s*```/g, '');
    cleanedText = cleanedText.replace(/```\s*|\s*```/g, '');
    
    console.log('🔍 Attempting to parse JSON of length:', cleanedText.length);
    
    const parsedQuestions = JSON.parse(cleanedText);
    
    if (!Array.isArray(parsedQuestions)) {
      throw new Error('Response is not an array');
    }
    
    console.log(`✅ Successfully parsed ${parsedQuestions.length} questions from DeepSeek R1`);
    return convertQuestionsFormat(parsedQuestions, difficulty);
    
  } catch (error) {
    console.error('Failed to parse DeepSeek R1 response:', error);
    console.log('Raw response excerpt:', responseText.substring(0, 500) + '...');
    
    // Try to extract questions manually as fallback
    return extractQuestionsManually(responseText, difficulty);
  }
}

/**
 * Convert parsed questions to our format with enhanced validation
 */
function convertQuestionsFormat(parsedQuestions: any[], difficulty: DifficultyLevel): GeneratedQuestion[] {
  const convertedQuestions = parsedQuestions.map((q: any, index: number) => {
    // Clean up options to remove ALL possible listing indicators
    const cleanedOptions = Array.isArray(q.options) && q.options.length === 4 
      ? q.options.map((option: string) => {
          if (typeof option === 'string') {
            return option
              .replace(/^[A-D]\)\s*/i, '') // Remove A), B), C), D) prefixes
              .replace(/^[A-D]\.\s*/i, '') // Remove A., B., C., D. prefixes  
              .replace(/^[A-D]\s*[-:]\s*/i, '') // Remove A -, B :, etc.
              .replace(/^[A-D]\s+/i, '') // Remove standalone A, B, C, D
              .replace(/^\d+\)\s*/, '') // Remove 1), 2), 3), 4) prefixes
              .replace(/^\d+\.\s*/, '') // Remove 1., 2., 3., 4. prefixes
              .trim();
          }
          return option;
        })
      : ['Option A', 'Option B', 'Option C', 'Option D'];

    return {
      question: q.question || `Question ${index + 1}`,
      options: [cleanedOptions[0], cleanedOptions[1], cleanedOptions[2], cleanedOptions[3]] as [string, string, string, string],
      correctAnswer: q.correctAnswer || 'A',
      explanation: q.explanation || 'No explanation provided',
      difficulty,
      topic: q.topic || 'General Knowledge'
    };
  });
  
  // Apply proper anti-pattern logic to ensure answer variety
  return ensureAnswerVariety(convertedQuestions);
}

/**
 * Enhanced fallback extraction for DeepSeek R1 responses
 */
function extractQuestionsManually(responseText: string, difficulty: DifficultyLevel): GeneratedQuestion[] {
  console.log('🔧 Attempting manual extraction from DeepSeek R1 response...');
  
  const questions: GeneratedQuestion[] = [];
  
  try {
    // Try to find question patterns
    const lines = responseText.split('\n');
    let currentQuestion = '';
    let currentOptions: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for question patterns
      if (trimmed.includes('?') && (trimmed.includes('What') || trimmed.includes('How') || trimmed.includes('Which') || trimmed.includes('Who'))) {
        if (currentQuestion && currentOptions.length >= 4) {
          // Save previous question
          questions.push({
            question: currentQuestion,
            options: [currentOptions[0] || 'A', currentOptions[1] || 'B', currentOptions[2] || 'C', currentOptions[3] || 'D'] as [string, string, string, string],
            correctAnswer: 'A',
            explanation: 'Generated from manual extraction',
            difficulty,
            topic: 'Extracted Content'
          });
        }
        currentQuestion = trimmed;
        currentOptions = [];
      }
      
      // Look for option patterns
      if (trimmed.match(/^[A-D][\)\.\s]|^\d+[\)\.\s]/)) {
        const cleanOption = trimmed.replace(/^[A-D][\)\.\s]|^\d+[\)\.\s]/, '').trim();
        if (cleanOption) {
          currentOptions.push(cleanOption);
        }
      }
    }
    
    // Don't forget the last question
    if (currentQuestion && currentOptions.length >= 4) {
      questions.push({
        question: currentQuestion,
        options: [currentOptions[0], currentOptions[1], currentOptions[2], currentOptions[3]] as [string, string, string, string],
        correctAnswer: 'A',
        explanation: 'Generated from manual extraction',
        difficulty,
        topic: 'Extracted Content'
      });
    }
    
  } catch (error) {
    console.error('Manual extraction failed:', error);
  }
  
  console.log(`🔧 Manual extraction yielded ${questions.length} questions`);
  return questions;
}

// Reuse validation and utility functions from the original implementation
function validateGeneratedQuestion(question: GeneratedQuestion): boolean {
  const rules = AUTO_CREATE_CONFIG.QUESTION_VALIDATION_RULES;
  
  if (!question.question || 
      question.question.length < rules.MIN_QUESTION_LENGTH || 
      question.question.length > rules.MAX_QUESTION_LENGTH) {
    return false;
  }
  
  if (!Array.isArray(question.options) || question.options.length !== rules.REQUIRED_OPTIONS_COUNT) {
    return false;
  }
  
  for (const option of question.options) {
    if (!option || 
        option.length < rules.MIN_OPTION_LENGTH || 
        option.length > rules.MAX_OPTION_LENGTH) {
      return false;
    }
  }
  
  if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
    return false;
  }
  
  return true;
}

function calculateGenerationQuality(questions: GeneratedQuestion[], request: QuestionGenerationRequest): number {
  if (questions.length === 0) return 0;
  
  let qualityScore = 10;
  
  // Quantity score
  const completionRatio = questions.length / request.numberOfQuestions;
  if (completionRatio < 0.5) qualityScore -= 4;
  else if (completionRatio < 0.8) qualityScore -= 2;
  else if (completionRatio < 1.0) qualityScore -= 1;
  
  // Individual question quality
  let totalQuestionQuality = 0;
  questions.forEach(question => {
    let questionQuality = 10;
    
    if (question.question.length < 20) questionQuality -= 2;
    if (!question.question.includes('?')) questionQuality -= 1;
    
    const optionLengths = question.options.map(opt => opt.length);
    const avgOptionLength = optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length;
    if (avgOptionLength < 5) questionQuality -= 2;
    
    const uniqueOptions = new Set(question.options);
    if (uniqueOptions.size < 4) questionQuality -= 3;
    
    totalQuestionQuality += Math.max(1, questionQuality);
  });
  
  const avgQuestionQuality = totalQuestionQuality / questions.length;
  qualityScore = (qualityScore + avgQuestionQuality) / 2;
  
  return Math.max(1, Math.min(10, Math.round(qualityScore)));
}

function validateGenerationRequest(request: QuestionGenerationRequest): { valid: boolean; error?: string } {
  if (!request.content || request.content.trim().length < 3) {
    return { valid: false, error: 'Content too short for question generation (minimum 3 characters)' };
  }
  
  // DeepSeek R1 Distill 70B has larger context window than previous models
  // Roughly 4 characters per token, so limit content to ~20,000 characters
  // to leave room for prompt overhead and output tokens
  if (request.content.length > 20000) {
    console.log(`⚠️ Content too long for DeepSeek R1 (${request.content.length} chars), truncating to 20,000...`);
    request.content = request.content.substring(0, 20000) + '... [content truncated for processing]';
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
 * Ensure that correct answers are distributed across A, B, C, D options
 * This prevents all questions from having the same correct answer and eliminates patterns
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
    const targetAnswer = shuffledAnswers[index];
    
    if (targetAnswer === question.correctAnswer) {
      return question; // Already correct
    }
    
    // Swap options to make target answer correct
    const newOptions = [...question.options];
    const currentCorrectIndex = ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);
    const targetCorrectIndex = ['A', 'B', 'C', 'D'].indexOf(targetAnswer);
    
    if (currentCorrectIndex >= 0 && targetCorrectIndex >= 0) {
      const temp = newOptions[currentCorrectIndex];
      newOptions[currentCorrectIndex] = newOptions[targetCorrectIndex];
      newOptions[targetCorrectIndex] = temp;
    }
    
    return {
      ...question,
      options: newOptions as [string, string, string, string],
      correctAnswer: targetAnswer
    };
  });
}

/**
 * Generate a preview of questions (for quick feedback)
 */
export async function generateQuestionPreviewWithDeepSeekR1(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  const previewRequest = {
    ...request,
    numberOfQuestions: Math.max(5, Math.min(request.numberOfQuestions, 10))
  };
  
  return generateQuestionsWithDeepSeekR1(previewRequest);
}
