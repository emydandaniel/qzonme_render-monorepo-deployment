// Simplified hybrid AI service for testing - will enhance once server is running
import type { QuestionGenerationRequest, QuestionGenerationResult } from './llamaVisionService';

/**
 * Temporary simplified hybrid AI service
 * This ensures the server can start while we debug the full implementation
 */

export async function generateQuestions(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  return {
    success: false,
    questions: [],
    metadata: {
      requestedCount: request.numberOfQuestions,
      generatedCount: 0,
      processingTime: 0,
      aiModel: 'hybrid-service-placeholder',
      contentLength: request.content?.length || 0,
      difficulty: request.difficulty,
      language: request.language,
      qualityScore: 0,
      error: 'Hybrid service temporarily simplified for server startup'
    }
  };
}

export async function generateQuestionPreview(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  return generateQuestions(request);
}

export async function generateQuestionsWithImage(request: QuestionGenerationRequest & { imageData: string }): Promise<QuestionGenerationResult> {
  return generateQuestions(request);
}

export async function checkAIServiceHealth() {
  return {
    llamaVisionAvailable: false,
    geminiAvailable: false,
    recommendedService: 'none' as const,
    details: { message: 'Hybrid service temporarily simplified for server startup' }
  };
}
