import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { questionAnswerSchema, QuestionAnswer, Quiz, Question } from "@shared/schema";
import QuizAnswer from "@/components/quiz/QuizAnswer";
import { calculateScore } from "@/lib/quizUtils";

interface AnswerQuizProps {
  params: {
    accessCode?: string;
    creatorSlug?: string;
  };
}

const AnswerQuiz: React.FC<AnswerQuizProps> = ({ params }) => {
  // Safely extract parameters
  const accessCode = params?.accessCode;
  const creatorSlug = params?.creatorSlug;
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userName = sessionStorage.getItem("userName") || "";
  const userId = parseInt(sessionStorage.getItem("userId") || "0");
  
  console.log("AnswerQuiz component rendered with params:", { params, accessCode, creatorSlug });

  // Check if user is logged in, if not, save the quiz info and redirect to home
  React.useEffect(() => {
    if (!userName || !userId) {
      // Save the quiz params to session storage
      if (accessCode) {
        sessionStorage.setItem("pendingQuizCode", accessCode);
      } else if (creatorSlug) {
        sessionStorage.setItem("pendingQuizSlug", creatorSlug);
      }
      
      // Redirect to home page to enter name
      navigate("/");
      return;
    }
  }, [accessCode, creatorSlug, navigate, userName, userId]);

  // Determine if we're using access code or creator slug
  const isUsingAccessCode = !!accessCode && !creatorSlug;
  const identifier = isUsingAccessCode ? accessCode : creatorSlug;
  const endpoint = isUsingAccessCode ? `/api/quizzes/code/${identifier}` : `/api/quizzes/slug/${identifier}`;
  
  // Debug the URL params
  React.useEffect(() => {
    console.log("URL Parameters:", { accessCode, creatorSlug, isUsingAccessCode, endpoint });
  }, [accessCode, creatorSlug, isUsingAccessCode, endpoint]);

  // Fetch quiz by access code or URL slug
  const { data: quiz, isLoading: isLoadingQuiz, error: quizError } = useQuery<Quiz>({
    queryKey: [endpoint],
    enabled: !!identifier,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });
  
  // Debug logs removed

  // Fetch questions for the quiz
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: [`/api/quizzes/${quiz?.id}/questions`],
    enabled: !!quiz?.id,
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
    return <div>Loading quiz...</div>;
  }

  if (quizError) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Quiz</h2>
        <p className="mb-4">There was a problem loading the quiz with identifier: <br />
          <code className="bg-gray-100 p-1 rounded">{identifier}</code>
        </p>
        <p className="text-sm text-gray-600">Error details: {(quizError as Error).message || 'Unknown error'}</p>
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-orange-500 mb-4">Quiz Not Found</h2>
        <p className="mb-4">We couldn't find a quiz with the identifier: <br />
          <code className="bg-gray-100 p-1 rounded">{identifier}</code>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          This quiz may have been removed or the link is incorrect.
        </p>
        <div className="mt-6">
          <a href="/find-quiz" className="text-blue-600 underline">
            Try finding the quiz by name or access code
          </a>
        </div>
      </div>
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
