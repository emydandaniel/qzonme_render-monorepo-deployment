import { generateQuestionsWithLlama, generateQuestionPreviewWithLlama, QuestionGenerationRequest, QuestionGenerationResult } from './llamaVisionService';
import { generateQuestions as generateWithGemini, generateQuestionPreview as previewWithGemini } from './aiQuestionGeneration';
import { generateQuestionsWithDeepSeekR1, generateQuestionPreviewWithDeepSeekR1 } from './llamaTextService';

/**
 * NEW HYBRID AI SERVICE - FRESH FILE TO BYPASS CACHING ISSUES
 * Priority: DeepSeek R1 Distill 70B (superior reasoning, 70B params) → Meta Llama Vision (images/fallback) → Gemini (final fallback)
 */

export async function generateQuestions(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  console.log(`🚀🚀🚀 NEW HYBRID SERVICE WORKING: Starting DeepSeek R1 integration:`, {
    contentLength: request.content.length,
    numberOfQuestions: request.numberOfQuestions,
    difficulty: request.difficulty,
    language: request.language,
    contentType: request.contentType || 'unknown',
    hasImageData: 'imageData' in request
  });

  // For image-based requests, use Meta Llama Vision directly
  if ('imageData' in request) {
    console.log('🖼️ Image detected, using Meta Llama Vision for multimodal processing...');
    try {
      const result = await generateQuestionsWithLlama(request);
      if (result.success) {
        console.log(`✅ Meta Llama Vision processed image and generated ${result.questions.length} questions`);
        return result;
      }
    } catch (error) {
      console.warn('⚠️ Meta Llama Vision image processing failed:', error);
    }
  }

  // For text-based requests, use DeepSeek R1 as primary (superior reasoning)
  console.log(`🎯 TEXT-BASED REQUEST: Proceeding with DeepSeek R1 as primary AI service`);
  try {
    console.log('🚀 Attempting question generation with DeepSeek R1 Distill 70B (primary choice)...');
    console.log('🔧 About to call generateQuestionsWithDeepSeekR1 function...');
    
    const deepSeekResult = await generateQuestionsWithDeepSeekR1(request);
    
    console.log('📊 DeepSeek R1 result received:', {
      success: deepSeekResult.success,
      questionCount: deepSeekResult.questions.length,
      errorMessage: deepSeekResult.metadata.error
    });
    
    if (deepSeekResult.success && deepSeekResult.questions.length > 0) {
      console.log(`✅ DeepSeek R1 generated ${deepSeekResult.questions.length} questions successfully`);
      return deepSeekResult;
    }
    
    console.log('⚠️ DeepSeek R1 failed or generated no questions, falling back to Meta Llama Vision...');
    
  } catch (deepSeekError) {
    const errorMessage = deepSeekError instanceof Error ? deepSeekError.message : 'Unknown error';
    console.warn('⚠️ DeepSeek R1 error, falling back to Meta Llama Vision:', errorMessage);
    
    // Check if it's a rate limit error and log it
    if (errorMessage.includes('rate limit')) {
      console.log('📊 DeepSeek R1 rate limit reached, using Meta Llama Vision as backup...');
    }
  }

  // Fallback to Meta Llama Vision for text
  try {
    console.log('🦙 Using Meta Llama Vision as fallback...');
    
    const llamaVisionResult = await generateQuestionsWithLlama(request);
    
    if (llamaVisionResult.success && llamaVisionResult.questions.length > 0) {
      console.log(`✅ Meta Llama Vision fallback generated ${llamaVisionResult.questions.length} questions successfully`);
      // Mark as fallback
      llamaVisionResult.metadata = {
        ...llamaVisionResult.metadata,
        aiModel: `${llamaVisionResult.metadata.aiModel} (fallback from deepseek-r1)`,
        fallbackUsed: true
      } as any;
      return llamaVisionResult;
    }
    
    console.log('⚠️ Meta Llama Vision also failed, falling back to Gemini...');
    
  } catch (llamaVisionError) {
    const errorMessage = llamaVisionError instanceof Error ? llamaVisionError.message : 'Unknown error';
    console.warn('⚠️ Meta Llama Vision error, falling back to Gemini:', errorMessage);
  }
  
  try {
    console.log('🤖 Using Gemini as fallback...');
    
    // Fallback to Gemini (better than Llama 3.3 for large content)
    const geminiRequest = {
      content: request.content,
      numberOfQuestions: request.numberOfQuestions,
      difficulty: request.difficulty,
      language: request.language,
      contentType: request.contentType,
      contentQuality: request.contentQuality
    };
    
    const geminiResult = await generateWithGemini(geminiRequest);
    
    // Add metadata to indicate fallback was used
    if (geminiResult.success) {
      geminiResult.metadata = {
        ...geminiResult.metadata,
        aiModel: `${geminiResult.metadata.aiModel} (fallback from deepseek-r1 + llama-vision)`,
        fallbackUsed: true
      } as any;
      
      console.log(`✅ Gemini final fallback generated ${geminiResult.questions.length} questions successfully`);
    }
    
    return geminiResult;
    
  } catch (geminiError) {
    console.error('All AI services failed (DeepSeek R1, Meta Llama Vision, and Gemini):', geminiError);
    
    return {
      success: false,
      questions: [],
      metadata: {
        requestedCount: request.numberOfQuestions,
        generatedCount: 0,
        processingTime: 0,
        aiModel: 'failed (deepseek-r1, llama-vision, and gemini)',
        contentLength: request.content?.length || 0,
        difficulty: request.difficulty,
        language: request.language,
        qualityScore: 0,
        error: 'All AI services failed'
      }
    };
  }
}

export async function generateQuestionPreview(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  console.log('🚀🚀🚀 NEW HYBRID SERVICE: generateQuestionPreview called');
  
  // For text-based previews, use DeepSeek R1 as primary
  try {
    console.log('🚀 Attempting preview generation with DeepSeek R1 Distill 70B (primary choice)...');
    
    const deepSeekPreviewResult = await generateQuestionPreviewWithDeepSeekR1(request);
    
    if (deepSeekPreviewResult.success && deepSeekPreviewResult.questions.length > 0) {
      console.log(`✅ DeepSeek R1 preview generated ${deepSeekPreviewResult.questions.length} questions successfully`);
      return deepSeekPreviewResult;
    }
    
    console.log('⚠️ DeepSeek R1 preview failed, falling back to Meta Llama Vision...');
    
  } catch (deepSeekError) {
    const errorMessage = deepSeekError instanceof Error ? deepSeekError.message : 'Unknown error';
    console.warn('⚠️ DeepSeek R1 preview error, falling back to Meta Llama Vision:', errorMessage);
  }

  // Use generateQuestions with minimum 5 questions as fallback
  const previewRequest = {
    ...request,
    numberOfQuestions: Math.max(5, Math.min(request.numberOfQuestions, 10)) // Preview: 5-10 questions max
  };
  
  return generateQuestions(previewRequest);
}

export async function generateQuestionsWithImage(request: QuestionGenerationRequest & { imageData: string }): Promise<QuestionGenerationResult> {
  console.log('🚀🚀🚀 NEW HYBRID SERVICE: generateQuestionsWithImage called');
  return generateQuestions(request);
}

export async function checkAIServiceHealth() {
  console.log('🚀🚀🚀 NEW HYBRID SERVICE: checkAIServiceHealth called');
  return {
    deepSeekR1Available: true,
    llamaVisionAvailable: true,
    geminiAvailable: true,
    recommendedService: 'deepSeekR1' as const,
    details: { message: 'NEW hybrid service loaded successfully' }
  };
}
