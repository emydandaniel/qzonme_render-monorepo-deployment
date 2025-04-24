import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardView from "@/components/quiz/Dashboard";
import ShareQuiz from "@/components/quiz/ShareQuiz";
import { Question, QuizAttempt, Quiz } from "@shared/schema";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import Layout from "@/components/common/Layout";
import { Card, CardContent } from "@/components/ui/card"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DashboardProps {
  params: {
    token: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ params }) => {
  const { token } = params;
  const queryClient = useQueryClient();
  const [showShareView, setShowShareView] = React.useState(false);

  // We no longer want to show the share view when coming to dashboard
  // The share view is only shown after quiz creation
  React.useEffect(() => {
    setShowShareView(false);
  }, [params.token]);

  // Fetch quiz by token
  const { 
    data: quiz, 
    isLoading: isLoadingQuiz,
    error: quizError
  } = useQuery<Quiz>({
    queryKey: [`/api/quizzes/dashboard/${token}`],
  });

  // Use the quizId from the fetched quiz for subsequent queries
  const quizId = quiz?.id;

  // Fetch questions once we have the quizId
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: [`/api/quizzes/${quizId}/questions`],
    enabled: !!quizId,
  });

  // Track the number of refreshes to trigger complete cache clearing periodically
  const [refreshCount, setRefreshCount] = React.useState(0);
  const [lastRefreshTime, setLastRefreshTime] = React.useState(Date.now());

  // Create a unique cache key that changes every time we want to force a complete refresh
  const cacheKey = React.useMemo(() => 
    `dashboard-${quizId}-${refreshCount}-${Date.now()}`, 
    [quizId, refreshCount]
  );
  
  // Fetch quiz attempts with ultra-aggressive refetching to ensure latest data
  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery<QuizAttempt[]>({
    queryKey: [`/api/quizzes/${quizId}/attempts`, cacheKey],
    enabled: !!quizId,
    refetchOnMount: "always", // Always refetch on mount
    staleTime: 0, // Consider data always stale to ensure refetch
    gcTime: 0, // Don't cache previous data
    refetchInterval: 3000, // Refetch every 3 seconds to catch new attempts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting
    retry: 3, // Retry failed requests 
    retryDelay: 1000, // Retry after 1 second
  });

  // Force refresh attempts data whenever dashboard is viewed + periodically
  useEffect(() => {
    if (!quizId) return;
    
    // Immediate refresh on component mount
    const refreshData = async () => {
      console.log("Dashboard: Force refresh attempts data");
      
      // Remove all previous queries from cache completely
      queryClient.removeQueries({ queryKey: [`/api/quizzes/${quizId}/attempts`] });
      
      // Manually fetch fresh data
      try {
        const response = await fetch(`/api/quizzes/${quizId}/attempts`);
        if (!response.ok) throw new Error('Failed to fetch attempts');
        
        const freshAttempts = await response.json();
        console.log(`Dashboard: Fetched ${freshAttempts.length} fresh attempts`);
        
        // Update the cache with new data
        queryClient.setQueryData([`/api/quizzes/${quizId}/attempts`, cacheKey], freshAttempts);
        
        // Trigger refresh counter increment every 30 seconds to force complete refresh
        const now = Date.now();
        if (now - lastRefreshTime > 30000) {
          setRefreshCount(prev => prev + 1);
          setLastRefreshTime(now);
          console.log("Dashboard: Triggered complete cache refresh");
        }
      } catch (error) {
        console.error("Error refreshing dashboard data:", error);
      }
    };
    
    // Execute immediately
    refreshData();
    
    // Also set up interval for periodic fresh fetches
    const intervalId = setInterval(refreshData, 5000);
    
    return () => clearInterval(intervalId);
  }, [quizId, queryClient, cacheKey, lastRefreshTime]);

  // Format expiration date if we have a quiz
  const formatExpirationDate = (createdAtString: string | Date) => {
    const createdAt = new Date(createdAtString);
    const expirationDate = new Date(createdAt);
    expirationDate.setDate(expirationDate.getDate() + 30);
    
    return expirationDate.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  // Check if quiz has expired (30 days after creation)
  const isQuizExpired = (createdAtString: string | Date) => {
    const createdAt = new Date(createdAtString);
    const expirationDate = new Date(createdAt);
    expirationDate.setDate(expirationDate.getDate() + 30);
    
    return new Date() > expirationDate;
  };

  if (isLoadingQuiz || (quizId && (isLoadingQuestions || isLoadingAttempts))) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center p-6 min-h-[200px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizError || !quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-500 mb-2">Dashboard Not Found</h2>
              <p>We couldn't find this dashboard. The token may be invalid or the quiz has expired.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if the quiz has expired
  if (isQuizExpired(quiz.createdAt)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-orange-500 mb-2">Quiz Expired</h2>
              <p>This quiz has expired after the 30-day limit and is no longer accessible.</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Quizzes are automatically removed 30 days after creation to keep the platform fresh.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showShareView) {
    return <ShareQuiz accessCode={quiz.accessCode} quizId={quiz.id} urlSlug={quiz.urlSlug} />;
  }

  console.log("Dashboard rendering with attempts:", attempts);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Expiration Warning */}
      <Alert variant="default" className="mb-6 border-amber-500 bg-amber-50 text-amber-700">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle>Quiz Expiration</AlertTitle>
        <AlertDescription>
          This quiz will expire on {formatExpirationDate(quiz.createdAt)}. After this date, 
          the quiz and dashboard will no longer be accessible.
        </AlertDescription>
      </Alert>
      
      <DashboardView
        quizId={quiz.id}
        accessCode={quiz.accessCode}
        questions={questions}
        attempts={attempts}
      />
    </div>
  );
};

export default Dashboard;
