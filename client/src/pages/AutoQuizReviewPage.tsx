import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Question } from '@shared/schema';
import AutoQuizReview from '@/components/quiz/AutoQuizReview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { generateAccessCode, generateUrlSlug, generateDashboardToken } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const AutoQuizReviewPage: React.FC = () => {
  const [, navigate] = useLocation();
  
  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      // Generate required fields
      const accessCode = generateAccessCode();
      const urlSlug = generateUrlSlug(quizData.creatorName);
      const dashboardToken = generateDashboardToken();

      const payload = {
        title: quizData.title,
        description: quizData.description,
        creatorName: quizData.creatorName,
        questions: quizData.questions,
        accessCode,
        urlSlug,
        dashboardToken
      };

      return apiRequest({
        url: "/api/quiz",
        method: "POST",
        data: payload
      });
    }
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const [showFinalDetails, setShowFinalDetails] = useState(false);
  
  // Quiz details for final step
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');

  useEffect(() => {
    // Load generated questions from sessionStorage
    const generatedQuestions = sessionStorage.getItem('generatedQuestions');
    const generationMetadata = sessionStorage.getItem('generationMetadata');
    
    if (!generatedQuestions) {
      // No questions found, redirect to auto-create page
      navigate('/auto-create');
      return;
    }

    try {
      const parsedQuestions = JSON.parse(generatedQuestions);
      const parsedMetadata = generationMetadata ? JSON.parse(generationMetadata) : null;
      
      setQuestions(parsedQuestions);
      setMetadata(parsedMetadata);
      
      // Pre-fill quiz details from metadata
      if (parsedMetadata) {
        setQuizTitle(parsedMetadata.suggestedTitle || '');
        setQuizDescription(parsedMetadata.suggestedDescription || '');
        setCreatorName(parsedMetadata.creatorName || '');
      }
    } catch (error) {
      console.error('Error parsing generated questions:', error);
      toast({
        title: "Error",
        description: "Failed to load generated questions. Please try again.",
        variant: "destructive"
      });
      navigate('/auto-create');
    }
  }, [navigate]);

  const handleStartReview = () => {
    setShowReview(true);
  };

  const handleQuestionsUpdated = (updatedQuestions: Question[]) => {
    setQuestions(updatedQuestions);
    // Update sessionStorage with edited questions
    sessionStorage.setItem('generatedQuestions', JSON.stringify(updatedQuestions));
  };

  const handleReviewComplete = () => {
    setShowReview(false);
    setShowFinalDetails(true);
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim() || !creatorName.trim() || questions.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in the quiz title, creator name, and ensure you have questions.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare quiz data
      const quizData = {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        creatorName: creatorName.trim(),
        questions: questions.map(q => ({
          text: q.text,
          options: q.options,
          correctAnswers: q.correctAnswers,
          imageUrl: q.imageUrl
        }))
      };

      const quiz = await createQuizMutation.mutateAsync(quizData);
      
      // Clear session storage
      sessionStorage.removeItem('generatedQuestions');
      sessionStorage.removeItem('generationMetadata');
      sessionStorage.removeItem('requiresReview');
      
      toast({
        title: "Quiz Created!",
        description: "Your quiz has been created successfully",
        variant: "default"
      });
      
      // Navigate to share page
      navigate(`/share/${quiz.id}`);
    } catch (error) {
      console.error('Failed to create quiz:', error);
      toast({
        title: "Error",
        description: "Failed to create quiz. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading generated questions...</p>
        </div>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <AutoQuizReview
            questions={questions}
            onQuestionsUpdated={handleQuestionsUpdated}
            onReviewComplete={handleReviewComplete}
          />
        </div>
      </div>
    );
  }

  if (showFinalDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <CardTitle>Finalize Your Quiz</CardTitle>
              </div>
              <p className="text-muted-foreground">
                All questions have been reviewed! Add final details to publish your quiz.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quiz-title">Quiz Title *</Label>
                <Input
                  id="quiz-title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Enter a catchy title for your quiz"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="quiz-description">Quiz Description</Label>
                <Textarea
                  id="quiz-description"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Describe what your quiz is about..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="creator-name">Your Name *</Label>
                <Input
                  id="creator-name"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Your name or username"
                  className="mt-1"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Quiz Summary</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>📝 {questions.length} questions ready</div>
                  {metadata?.generationSettings && (
                    <>
                      <div>🎯 Difficulty: {metadata.generationSettings.difficulty || 'Medium'}</div>
                      <div>🌐 Language: {metadata.generationSettings.language || 'English'}</div>
                    </>
                  )}
                  <div>✅ All questions reviewed and verified</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFinalDetails(false)}
                  className="flex-1"
                >
                  Review Questions Again
                </Button>
                <Button
                  onClick={handleCreateQuiz}
                  disabled={!quizTitle.trim() || !creatorName.trim() || createQuizMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {createQuizMutation.isPending ? 'Creating...' : 'Create Quiz'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Initial overview page
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              <CardTitle>AI-Generated Quiz Ready for Review</CardTitle>
            </div>
            <p className="text-muted-foreground">
              Your quiz has been generated! Review each question to ensure accuracy before publishing.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quiz Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-sm text-muted-foreground">Questions Generated</div>
              </div>
              {metadata?.generationSettings && (
                <>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {metadata.generationSettings.difficulty || 'Medium'}
                    </div>
                    <div className="text-sm text-muted-foreground">Difficulty Level</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {metadata.generationSettings.language || 'English'}
                    </div>
                    <div className="text-sm text-muted-foreground">Language</div>
                  </div>
                </>
              )}
            </div>

            {/* Source Information */}
            {metadata?.sourceInfo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Generated From:</h4>
                <div className="text-sm text-muted-foreground">
                  {metadata.sourceInfo.type === 'url' && (
                    <div>🔗 Website: {metadata.sourceInfo.url}</div>
                  )}
                  {metadata.sourceInfo.type === 'youtube' && (
                    <div>📺 YouTube Video: {metadata.sourceInfo.title || metadata.sourceInfo.url}</div>
                  )}
                  {metadata.sourceInfo.type === 'file' && (
                    <div>📄 File: {metadata.sourceInfo.filename} ({metadata.sourceInfo.fileType})</div>
                  )}
                </div>
              </div>
            )}

            {/* Review Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">📋 Review Process</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• You'll review each question one by one</li>
                <li>• Questions are automatically marked as reviewed when viewed</li>
                <li>• You can edit any question if needed</li>
                <li>• You cannot skip questions - each must be reviewed</li>
                <li>• After reviewing all questions, you'll finalize quiz details</li>
              </ul>
            </div>

            {/* Start Review Button */}
            <div className="text-center pt-4">
              <Button 
                onClick={handleStartReview}
                size="lg"
                className="gap-2"
              >
                Start Reviewing Questions
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AutoQuizReviewPage;
