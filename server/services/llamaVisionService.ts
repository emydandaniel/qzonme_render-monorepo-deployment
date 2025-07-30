import { AUTO_CREATE_CONFIG, DifficultyLevel, SupportedLanguage } from '@shared/autoCreateConfig';

export interface QuestionGenerationRequest {
  content: string;
  numberOfQuestions: number;
  difficulty: DifficultyLevel;
  language: SupportedLanguage;
  contentType?: 'document' | 'youtube' | 'topic' | 'mixed';
  contentQuality?: number;
  imageData?: string; // Base64 encoded image for vision processing
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
 * Generate quiz questions using Meta Llama Vision via Together.ai
 */
export async function generateQuestionsWithLlama(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  const startTime = Date.now();
  
  try {
    // Validate request
    const validation = validateGenerationRequest(request);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check for Together.ai API key
    if (!process.env.TOGETHER_AI_API_KEY) {
      throw new Error('Together.ai API key not configured');
    }

    console.log(`🦙 Using Meta Llama Vision via Together.ai for enhanced question generation`);

    // Enhance content for better diversity and handle large PDFs
    const enhancedRequest = enhanceContentForDiversity(request);

    // Create the prompt based on whether we have image data or text content
    const prompt = enhancedRequest.imageData 
      ? createVisionPrompt(enhancedRequest)
      : createTextPrompt(enhancedRequest);

    // Prepare the API request
    const apiRequest = enhancedRequest.imageData
      ? createVisionAPIRequest(prompt, enhancedRequest)
      : createTextAPIRequest(prompt, enhancedRequest);

    // Make the API call with retry logic and rate limit handling
    let result;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
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
          
          // Check for rate limit errors
          if (response.status === 429 || errorMessage.includes('rate limit')) {
            console.warn('⚠️ Together.ai rate limit reached, falling back to Google AI...');
            // Fall back to Google AI immediately for rate limits
            const { generateQuestions } = await import('./aiQuestionGeneration');
            return await generateQuestions(request);
          }
          
          throw new Error(`Together.ai API error: ${response.status} - ${errorMessage}`);
        }

        result = await response.json();
        break;
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a rate limit error in the message
        if (errorMessage.includes('rate limit')) {
          console.warn('⚠️ Together.ai rate limit detected, falling back to Google AI...');
          const { generateQuestions } = await import('./aiQuestionGeneration');
          return await generateQuestions(request);
        }
        
        if (attempts >= maxAttempts) throw error;
        
        console.warn(`Llama Vision generation attempt ${attempts} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
      }
    }

    if (!result || !result.choices || !result.choices[0]) {
      throw new Error('Invalid response from Together.ai API');
    }

    // Parse the response
    const responseText = result.choices[0].message.content;
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
        aiModel: 'meta-llama/Llama-Vision-Free',
        contentLength: request.content.length,
        difficulty: request.difficulty,
        language: request.language,
        qualityScore
      }
    };
    
  } catch (error) {
    console.error('Llama Vision question generation error:', error);
    
    return {
      success: false,
      questions: [],
      metadata: {
        requestedCount: request.numberOfQuestions,
        generatedCount: 0,
        processingTime: Date.now() - startTime,
        aiModel: 'meta-llama/Llama-Vision-Free',
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
 * Create API request for text-based content
 */
function createTextAPIRequest(prompt: string, request: QuestionGenerationRequest) {
  return {
    model: 'meta-llama/Llama-Vision-Free',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt }
        ]
      }
    ],
    max_tokens: 4000,
    temperature: 0.7,
    top_p: 0.9,
    stream: false
  };
}

/**
 * Create API request for image-based content with vision capabilities
 */
function createVisionAPIRequest(prompt: string, request: QuestionGenerationRequest) {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt
        }
      ] as any[]
    }
  ];

  // Add image if provided
  if (request.imageData) {
    messages[0].content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${request.imageData}`
      }
    });
  }

  return {
    model: 'meta-llama/Llama-Vision-Free',
    messages,
    max_tokens: 4000,
    temperature: 0.7,
    top_p: 0.9,
    stream: false
  };
}

/**
 * Create prompt for vision-based processing (images/PDFs)
 */
function createVisionPrompt(request: QuestionGenerationRequest): string {
  const { numberOfQuestions, difficulty, language, contentType } = request;
  
  const difficultyInstructions = {
    Easy: 'Focus on basic facts, definitions, and simple recall from the image. Questions should be straightforward with obvious correct answers.',
    Medium: 'Include some analysis and application questions about the image content. Mix factual recall with understanding and basic reasoning.',
    Hard: 'Emphasize critical thinking, analysis, synthesis, and complex reasoning about the image content. Include questions that require deeper understanding.'
  };
  
  const languageInstruction = language === 'English' ? '' : `Generate all questions and answers in ${language}. `;
  
  return `You are an expert quiz creator with vision capabilities. ${languageInstruction}Analyze the provided image/document and generate exactly ${numberOfQuestions} multiple-choice questions based on what you can see and read in the image.

DIFFICULTY LEVEL: ${difficulty}
${difficultyInstructions[difficulty]}

VISION ANALYSIS INSTRUCTIONS:
1. First, carefully examine the image for text, diagrams, charts, tables, or any visual information
2. If it's a document, read and understand the text content
3. If it contains diagrams or visual elements, analyze their meaning and relationships
4. Extract key concepts, facts, and information from both text and visual elements

QUESTION GENERATION REQUIREMENTS:
1. Each question must have exactly 4 options labeled A, B, C, D
2. Only one option should be correct
3. Questions should be clear, unambiguous, and well-written
4. Base questions on what you can actually see and read in the image
5. Include a mix of question types (factual, analytical, application)
6. Make incorrect options plausible but clearly wrong
7. Ensure questions test understanding of the image content
8. CRITICAL: VARY THE CORRECT ANSWERS! Do NOT make all answers "A". For ${numberOfQuestions} questions:
   - Question 1: Make answer "A"  
   - Question 2: Make answer "B"
   - Question 3: Make answer "C" 
   - Question 4: Make answer "D"
   - Question 5: Make answer "A" (repeat pattern)
   - Continue alternating A, B, C, D for remaining questions

FORMAT: Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Your question based on the image content?",
    "options": ["Clean option text without A), B), C), D) or A., B., C., D. prefixes", "Another clean option", "Third clean option", "Fourth clean option"],
    "correctAnswer": "B",
    "explanation": "Brief explanation of why this is correct based on the image",
    "topic": "Main topic/subject visible in the image"
  }
]

CRITICAL: Do NOT include A), B), C), D) or A., B., C., D. or any listing indicators in the options array. Just provide clean option text like "DNA", "Proteins", "Lipids", "Carbohydrates".

${request.content ? `Additional context: ${request.content}` : ''}

Analyze the image and generate exactly ${numberOfQuestions} questions now:`;
}

/**
 * Create prompt for text-based content processing with enhanced creativity and diversity
 * Incorporates all the improvements from Meta Llama 3.3 70B implementation
 */
function createTextPrompt(request: QuestionGenerationRequest): string {
  const { content, numberOfQuestions, difficulty, language, contentType } = request;
  
  const difficultyInstructions = {
    Easy: 'Create straightforward questions focusing on basic facts, simple recall, and obvious concepts. Make correct answers clearly distinguishable.',
    Medium: 'Generate questions requiring moderate analysis and understanding. Mix factual recall with reasoning and application of concepts.',
    Hard: 'Design challenging questions requiring critical thinking, analysis, synthesis, and deep reasoning. Include complex scenarios and nuanced understanding.'
  };
  
  const languageInstruction = language === 'English' ? '' : `IMPORTANT: Generate ALL content (questions, options, explanations) in ${language}. `;
  
  const contentTypeHint = getContentTypeHint(contentType);
  
  // Add creativity and diversity elements (from our Llama 3.3 improvements)
  const creativityInstructions = generateCreativityInstructions(request);
  const questionTypes = getRandomQuestionTypes(numberOfQuestions);
  const diversityPrompt = generateDiversityPrompt();
  
  return `You are an expert quiz creator powered by Meta Llama Vision. ${languageInstruction}Your task is to create exactly ${numberOfQuestions} high-quality, DIVERSE, and CREATIVE multiple-choice questions based on the provided content.

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

Generate exactly ${numberOfQuestions} UNIQUE and DIVERSE questions now:`;
}

/**
 * Get content type specific hints for better question generation
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
 * Enhance content for better diversity, especially for short topics
 * Also handles content truncation for large documents like PDFs
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
  
  // For large content (especially PDFs), implement intelligent chunking for Meta Llama Vision
  if (content.length > 30000) {
    console.log(`📄 Large content detected (${content.length} chars), implementing smart chunking for Meta Llama Vision...`);
    
    // For very large PDFs, use intelligent chunking strategy
    // Take beginning (key concepts), middle section (detailed content), and end (conclusions)
    const chunkSize = 8000;
    const firstChunk = content.substring(0, chunkSize);
    const midPoint = Math.floor(content.length / 2);
    const middleChunk = content.substring(midPoint - chunkSize/2, midPoint + chunkSize/2);
    const lastChunk = content.substring(content.length - chunkSize);
    
    const chunkedContent = `${firstChunk}\n\n[... comprehensive content spanning ${content.length} characters, strategically sampled for question generation ...]\n\n${middleChunk}\n\n[... continuing with detailed analysis and examples ...]\n\n${lastChunk}`;
    
    console.log(`📄 Content intelligently chunked from ${content.length} to ${chunkedContent.length} characters for optimal processing`);
    
    return {
      ...request,
      content: chunkedContent
    };
  }
  
  // For medium-sized content, optimize for Meta Llama Vision
  if (content.length > 15000) {
    console.log(`📄 Medium content detected (${content.length} chars), optimizing for Meta Llama Vision...`);
    
    // Take first 10k chars and last 5k chars to preserve key information
    const firstPart = content.substring(0, 10000);
    const lastPart = content.substring(content.length - 5000);
    const optimizedContent = firstPart + '\n\n[... middle section optimized for processing ...]\n\n' + lastPart;
    
    console.log(`📄 Content optimized from ${content.length} to ${optimizedContent.length} characters`);
    
    return {
      ...request,
      content: optimizedContent
    };
  }
  
  return request;
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
 * Parse AI response and extract questions (same logic as Gemini implementation)
 */
function parseAIResponse(responseText: string, difficulty: DifficultyLevel): GeneratedQuestion[] {
  try {
    // Clean up the response text
    let cleanedText = responseText.trim();
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*|\s*```/g, '');
    cleanedText = cleanedText.replace(/```\s*|\s*```/g, ''); // Handle plain code blocks too
    
    // Find JSON array in the response
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('No JSON array found, attempting to parse entire cleaned text...');
      // Try parsing the entire cleaned text as fallback
      const parsedQuestions = JSON.parse(cleanedText);
      if (Array.isArray(parsedQuestions)) {
        return convertQuestionsFormat(parsedQuestions, difficulty);
      }
      throw new Error('No valid JSON array found in AI response');
    }
    
    const jsonText = jsonMatch[0];
    const parsedQuestions = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedQuestions)) {
      throw new Error('AI response is not an array');
    }
    
    return convertQuestionsFormat(parsedQuestions, difficulty);
    
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.log('Raw response:', responseText);
    
    // Try to extract questions manually as fallback
    return extractQuestionsManually(responseText, difficulty);
  }
}

/**
 * Convert parsed questions to our format and add difficulty
 */
function convertQuestionsFormat(parsedQuestions: any[], difficulty: DifficultyLevel): GeneratedQuestion[] {
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

// Reuse validation functions from the original implementation
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

function validateGenerationRequest(request: QuestionGenerationRequest): { valid: boolean; error?: string } {
  if (!request.content && !request.imageData) {
    return { valid: false, error: 'Either content or image data is required' };
  }
  
  // More lenient content length validation - allow shorter content for topics
  if (request.content && request.content.trim().length < 3 && !request.imageData) {
    return { valid: false, error: 'Content too short for question generation (minimum 3 characters)' };
  }
  
  if (request.content && request.content.length > 50000) {
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
 * Ensure that correct answers are distributed across A, B, C, D options
 * This prevents all questions from having the same correct answer
 */
function ensureAnswerVariety(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  if (questions.length === 0) return questions;
  
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
    const targetCorrectAnswer = shuffledAnswers[index];
    
    if (targetCorrectAnswer === question.correctAnswer) {
      // Already correct, no change needed
      console.log(`✅ Question ${index + 1}: Answer ${targetCorrectAnswer} already correct`);
      return question;
    }
    
    console.log(`🔄 Question ${index + 1}: Changing answer from ${question.correctAnswer} to ${targetCorrectAnswer}`);
    
    // Swap the options to make the target answer correct
    const newOptions = [...question.options];
    const currentCorrectIndex = ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);
    const targetCorrectIndex = ['A', 'B', 'C', 'D'].indexOf(targetCorrectAnswer);
    
    if (currentCorrectIndex >= 0 && targetCorrectIndex >= 0 && 
        currentCorrectIndex < newOptions.length && targetCorrectIndex < newOptions.length) {
      // Swap the options
      const temp = newOptions[currentCorrectIndex];
      newOptions[currentCorrectIndex] = newOptions[targetCorrectIndex];
      newOptions[targetCorrectIndex] = temp;
    }
    
    return {
      ...question,
      options: newOptions as [string, string, string, string], // Fix TypeScript error
      correctAnswer: targetCorrectAnswer
    };
  });
}

/**
 * Generate a preview of questions (fewer questions for quick feedback)
 */
export async function generateQuestionPreviewWithLlama(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  const previewRequest = {
    ...request,
    numberOfQuestions: Math.min(3, request.numberOfQuestions) // Generate max 3 questions for preview
  };
  
  return generateQuestionsWithLlama(previewRequest);
}
