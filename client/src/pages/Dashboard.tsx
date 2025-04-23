import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardView from "@/components/quiz/Dashboard";
import ShareQuiz from "@/components/quiz/ShareQuiz";
import { Question, QuizAttempt, Quiz } from "@shared/schema";
import { Loader2 } from "lucide-react";
import Layout from "@/components/common/Layout";
import { Card, CardContent } from "@/components/ui/card"; 

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

  // Force refresh attempts data whenever dashboard is viewed
  useEffect(() => {
    if (quizId) {
      // Force refetch attempts to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${quizId}/attempts`] });
      console.log("Dashboard: Invalidated attempts query to refresh leaderboard data");
    }
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

  // Fetch quiz attempts with improved refetching
  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery<QuizAttempt[]>({
    queryKey: [`/api/quizzes/${quizId}/attempts`],
    enabled: !!quizId,
    refetchOnMount: true, // Always refetch on mount
    staleTime: 0, // Consider data always stale to ensure refetch
    refetchInterval: 10000, // Refetch every 10 seconds to catch new attempts
  });

  if (isLoadingQuiz || isLoadingQuestions || isLoadingAttempts) {
    return (
      <Layout>
        <Card>
          <CardContent className="flex items-center justify-center p-6 min-h-[200px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading dashboard...</p>
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
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-500 mb-2">Quiz Not Found</h2>
              <p>We couldn't find this quiz. It may have been removed or expired.</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (showShareView) {
    return <ShareQuiz accessCode={quiz.accessCode} quizId={quizId} urlSlug={quiz.urlSlug} />;
  }

  console.log("Dashboard rendering with attempts:", attempts);

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
