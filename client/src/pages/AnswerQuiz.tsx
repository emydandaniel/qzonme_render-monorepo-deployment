import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { questionAnswerSchema, QuestionAnswer, Quiz, Question } from "@shared/schema";
import QuizAnswer from "@/components/quiz/QuizAnswer";
import { calculateScore } from "@/lib/quizUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Layout from "@/components/common/Layout";

interface AnswerQuizProps {
  params: {
    accessCode?: string;
    creatorSlug?: string;
  };
}

const AnswerQuiz: React.FC<AnswerQuizProps> = ({ params }) => {
  const { accessCode, creatorSlug } = params;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userName = sessionStorage.getItem("userName") || "";
  const userId = parseInt(sessionStorage.getItem("userId") || "0");

  // Check if user is logged in, if not, save the quiz info and redirect to home
  // We use session storage to temporarily store the original URL parameters
  // This does NOT affect which quiz data is loaded - it only ensures the user returns to the right quiz
  React.useEffect(() => {
    if (!userName || !userId) {
      console.log("User not logged in, saving quiz params to session storage");
      
      // Clear any existing pending quiz data to prevent conflicts
      sessionStorage.removeItem("pendingQuizCode");
      sessionStorage.removeItem("pendingQuizSlug");
      
      // Save the current quiz params to session storage
      if (accessCode) {
        sessionStorage.setItem("pendingQuizCode", accessCode);
      } else if (creatorSlug) {
        sessionStorage.setItem("pendingQuizSlug", creatorSlug);
      }
      
      // Redirect to home page to enter name
      navigate("/");
      return;
    }
    
    console.log(`Logged in user ${userName} loading quiz with params:`, { accessCode, creatorSlug });
  }, [accessCode, creatorSlug, navigate, userName, userId]);

  // Determine if we're using access code or creator slug
  const isUsingAccessCode = !!accessCode && !creatorSlug;
  const identifier = isUsingAccessCode ? accessCode : creatorSlug;
  const endpoint = isUsingAccessCode ? `/api/quizzes/code/${identifier}` : `/api/quizzes/slug/${identifier}`;

  // Fetch quiz by access code or URL slug
  const { data: quiz, isLoading: isLoadingQuiz, error: quizError } = useQuery<Quiz>({
    queryKey: [endpoint],
    enabled: !!identifier && !!userName && !!userId,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    staleTime: 0, // Don't use stale data
    refetchOnMount: true, // Always refetch on mount
  });
  
  // Debug logs removed

  // Fetch questions for the quiz
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: [`/api/quizzes/${quiz?.id}/questions`],
    enabled: !!quiz?.id,
    staleTime: 0, // Don't use stale data
    refetchOnMount: true, // Always refetch on mount
  });

  // Submit quiz attempt
  const submitAttemptMutation = useMutation({
    mutationFn: async (data: {
      answers: QuestionAnswer[];
      score: number;
    }) => {
      const response = await apiRequest("POST", "/api/quiz-attempts", {
        quizId: quiz?.id,
        userAnswerId: userId,
        userName,
        score: data.score,
        totalQuestions: questions.length,
        answers: data.answers
      });
      return response.json();
    },
    onSuccess: (data) => {
      navigate(`/results/${quiz?.id}/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit quiz attempt",
        variant: "destructive"
      });
    }
  });

  const handleQuizComplete = (answers: QuestionAnswer[], score: number) => {
    submitAttemptMutation.mutate({ answers, score });
  };

  if (isLoadingQuiz || isLoadingQuestions) {
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-40">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading quiz...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (quizError) {
    // Convert error object to string for debugging
    const errorMessage = quizError instanceof Error 
      ? quizError.message
      : 'Unknown error occurred';
    
    // Extract more details if it's a response error
    let detailedError = "";
    try {
      if (errorMessage.includes('{')) {
        const jsonPart = errorMessage.substring(errorMessage.indexOf('{'));
        const errorObj = JSON.parse(jsonPart);
        detailedError = errorObj.message || 'No detailed message available';
      }
    } catch (e) {
      detailedError = errorMessage;
    }

    console.log("Quiz error details:", { errorMessage, detailedError });
    
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Quiz</h2>
              <p className="mb-4">There was a problem loading the quiz with identifier: <br />
                <code className="bg-gray-100 p-1 rounded">{identifier}</code>
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Please check that the URL is correct and try again.
                <br />
                <span className="text-xs text-red-500">{detailedError}</span>
              </p>
              <Button onClick={() => window.location.href = "/"}>
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }
  
  if (!quiz) {
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-orange-500 mb-4">Quiz Not Found</h2>
              <p className="mb-4">We couldn't find a quiz with the identifier: <br />
                <code className="bg-gray-100 p-1 rounded">{identifier}</code>
              </p>
              <p className="text-sm text-gray-600 mb-6">
                This quiz may have been removed or the link is incorrect.
              </p>
              <Button onClick={() => window.location.href = "/"}>
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <QuizAnswer
      quizId={quiz.id}
      quizCreator={quiz.creatorName}
      questions={questions}
      onComplete={handleQuizComplete}
    />
  );
};

export default AnswerQuiz;
