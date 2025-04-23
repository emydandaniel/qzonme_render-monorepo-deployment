import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ResultsView from "@/components/quiz/ResultsView";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/common/Layout";
import { Loader2 } from "lucide-react";

interface ResultsProps {
  params: {
    quizId: string;
    attemptId: string;
  };
}

const Results: React.FC<ResultsProps> = ({ params }) => {
  const quizId = parseInt(params.quizId);
  const attemptId = parseInt(params.attemptId);
  const userName = sessionStorage.getItem("userName") || "";
  const queryClient = useQueryClient();

  // Refetch attempts when component mounts to ensure we have the latest data including the current user's attempt
  useEffect(() => {
    if (quizId) {
      // Force refetch all relevant data to ensure we have the latest
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}/attempts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/quiz-attempts/${attemptId}`] });
      console.log("Results page: Invalidated queries to refresh data");
      
      // Set an interval to periodically refresh the attempts data
      const intervalId = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}/attempts`] });
        console.log("Results page: Auto-refreshing attempts data");
      }, 10000); // Refresh every 10 seconds
      
      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    }
  }, [quizId, attemptId, queryClient]);

  // Fetch quiz
  const { data: quiz, isLoading: isLoadingQuiz, error: quizError } = useQuery<any>({
    queryKey: [`/api/quizzes/${quizId}`],
    refetchOnWindowFocus: true,
  });

  // Fetch questions
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<any[]>({
    queryKey: [`/api/quizzes/${quizId}/questions`],
    enabled: !!quizId,
  });

  // Fetch quiz attempts
  const { 
    data: attempts = [], 
    isLoading: isLoadingAttempts,
    error: attemptsError,
  } = useQuery<any[]>({
    queryKey: [`/api/quizzes/${quizId}/attempts`],
    enabled: !!quizId,
    refetchOnMount: true, // Always refetch on mount
    staleTime: 0, // Consider data always stale to ensure refetch
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchOnWindowFocus: true
  });

  // Fetch this specific attempt
  const { data: thisAttempt, isLoading: isLoadingAttempt } = useQuery<any>({
    queryKey: [`/api/quiz-attempts/${attemptId}`],
    enabled: !!attemptId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  console.log("Results page - current attempts data:", attempts);
  console.log("Results page - current username:", userName);

  if (
    isLoadingQuiz ||
    isLoadingQuestions ||
    isLoadingAttempts ||
    isLoadingAttempt
  ) {
    return (
      <Layout>
        <Card>
          <CardContent className="flex items-center justify-center p-6 min-h-[200px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading your quiz results...</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (quizError || !quiz) {
    return (
      <Layout>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Quiz</h2>
              <p>Unable to load the quiz data. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (!thisAttempt) {
    return (
      <Layout>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-orange-500 mb-2">Results Not Found</h2>
              <p>We couldn't find your quiz attempt. It may have been removed.</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  // Type casting to fix TypeScript errors
  return (
    <ResultsView
      userName={userName}
      quizCreator={quiz.creatorName || ""}
      questions={questions as any[]}
      answers={thisAttempt.answers || []}
      attempts={attempts as any[]}
      score={thisAttempt.score || 0}
      currentAttemptId={attemptId}
    />
  );
};

export default Results;
