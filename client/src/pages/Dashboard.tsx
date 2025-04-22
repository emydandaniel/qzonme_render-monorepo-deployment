import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardView from "@/components/quiz/Dashboard";
import ShareQuiz from "@/components/quiz/ShareQuiz";
import { Question, QuizAttempt, Quiz } from "@shared/schema";

interface DashboardProps {
  params: {
    quizId: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ params }) => {
  const quizId = parseInt(params.quizId);
  const [showShareView, setShowShareView] = React.useState(false);
  const queryClient = useQueryClient();

  // We no longer want to show the share view when coming to dashboard
  // The share view is only shown after quiz creation
  React.useEffect(() => {
    setShowShareView(false);
  }, [params.quizId]);
  
  // Setup auto-refresh for attempts data
  useEffect(() => {
    // Force an immediate refresh of attempts data
    queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}/attempts`] });
    
    // Set up polling to regularly check for new attempts
    const intervalId = setInterval(() => {
      console.log("Refreshing dashboard attempts data...");
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}/attempts`] });
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(intervalId); // Clean up interval on unmount
  }, [quizId, queryClient]);

  // Fetch quiz
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery<Quiz>({
    queryKey: [`/api/quizzes/${quizId}`],
  });

  // Fetch questions
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: [`/api/quizzes/${quizId}/questions`],
    enabled: !!quizId,
  });

  // Fetch quiz attempts with more aggressive refresh settings
  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery<QuizAttempt[]>({
    queryKey: [`/api/quizzes/${quizId}/attempts`],
    enabled: !!quizId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Consider data always stale, forcing refetch
  });

  if (isLoadingQuiz || isLoadingQuestions || isLoadingAttempts) {
    return <div>Loading dashboard...</div>;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  if (showShareView) {
    return <ShareQuiz accessCode={quiz.accessCode} quizId={quizId} urlSlug={quiz.urlSlug} />;
  }

  return (
    <DashboardView
      quizId={quizId}
      accessCode={quiz.accessCode}
      questions={questions}
      attempts={attempts}
    />
  );
};

export default Dashboard;
