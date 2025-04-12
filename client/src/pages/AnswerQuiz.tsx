import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { questionAnswerSchema, QuestionAnswer } from "@shared/schema";
import QuizAnswer from "@/components/quiz/QuizAnswer";
import { calculateScore } from "@/lib/quizUtils";

interface AnswerQuizProps {
  params: {
    accessCode: string;
  };
}

const AnswerQuiz: React.FC<AnswerQuizProps> = ({ params }) => {
  const { accessCode } = params;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userName = sessionStorage.getItem("userName") || "";
  const userId = parseInt(sessionStorage.getItem("userId") || "0");

  // Fetch quiz by access code
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery({
    queryKey: [`/api/quizzes/${accessCode}`],
    enabled: !!accessCode,
  });

  // Fetch questions for the quiz
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
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

  if (!quiz) {
    return <div>Quiz not found</div>;
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
