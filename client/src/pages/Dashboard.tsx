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

  // Force refresh with drastic approach to ensure updates across browsers
  useEffect(() => {
    if (!quizId) return;
    
    // Function to force reload page entirely - most reliable but user-disruptive method
    const forcePageReload = () => {
      console.log("FORCE RELOAD: Dashboard page will refresh completely");
      // Add cache busting parameter to reload fresh
      window.location.href = `${window.location.pathname}?t=${Date.now()}`;
    };
    
    // Less disruptive refresh that still fetches data directly
    const refreshData = async () => {
      console.log("Dashboard: Force refresh attempts data");
      
      // Clear all cache entries to ensure fresh data
      queryClient.clear();
      
      // Add cache busting to fetch call
      const timestamp = Date.now();
      
      // Directly fetch data with aggressive cache prevention
      try {
        const response = await fetch(`/api/quizzes/${quizId}/attempts?nocache=${timestamp}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch attempts');
        
        const freshAttempts = await response.json();
        console.log(`Dashboard: Fetched ${freshAttempts.length} fresh attempts`);
        
        // Force count update to trigger UI refresh
        queryClient.setQueryData([`/api/quizzes/${quizId}/attempts`, cacheKey], freshAttempts);
        
        // Trigger refresh counter increment to force complete refresh
        const now = Date.now();
        if (now - lastRefreshTime > 15000) { // Every 15 seconds do more aggressive refresh  
          setRefreshCount(prev => prev + 1);
          setLastRefreshTime(now);
          
          // Every minute do a complete page reload to ensure freshest data
          if (refreshCount % 4 === 0) {
            forcePageReload();
          }
        }
      } catch (error) {
        console.error("Error refreshing dashboard data:", error);
      }
    };
    
    // Execute immediately
    refreshData();
    
    // Set up VERY frequent interval for aggressive fresh fetches
    const intervalId = setInterval(refreshData, 2500); // Check every 2.5 seconds
    
    // Also set up a backup full page reload every 2 minutes as absolute fallback
    const reloadIntervalId = setInterval(forcePageReload, 120000);
    
    return () => {
      clearInterval(intervalId);
      clearInterval(reloadIntervalId);
    };
  }, [quizId, queryClient, cacheKey, lastRefreshTime, refreshCount]);

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
