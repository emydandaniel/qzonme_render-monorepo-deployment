import React from "react";
import { useQuery } from "@tanstack/react-query";
import ShareQuiz from "@/components/quiz/ShareQuiz";
import { useToast } from "@/hooks/use-toast";
import MetaTags from "@/components/common/MetaTags";

interface ShareQuizPageProps {
  params: {
    quizId: string;
  };
}

const ShareQuizPage: React.FC<ShareQuizPageProps> = ({ params }) => {
  console.log('ShareQuizPage params:', params);
  const quizId = parseInt(params.quizId);
  console.log('ShareQuizPage quizId:', quizId);
  const { toast } = useToast();

  // Fetch quiz with proper type and improved timeout handling
  const { data: quiz, isLoading: isLoadingQuiz, error } = useQuery<{
    id: number;
    accessCode: string;
    urlSlug: string;
    creatorName: string;
    createdAt: string;
  }>({
    queryKey: [`/api/quizzes/${quizId}`],
    queryFn: async () => {
      console.log(`Making API request to: /api/quizzes/${quizId}`);
      
      // Create a faster timeout promise (5 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000);
      });
      
      // Race the fetch against the timeout
      const fetchPromise = fetch(`/api/quizzes/${quizId}`, {
        credentials: "include",
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error (${response.status}):`, errorText);
          throw new Error(`${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`API Success for quiz ${quizId}:`, data);
        return data;
      });
      
      return Promise.race([fetchPromise, timeoutPromise]);
    },
    staleTime: 0, // Don't use cached data
    refetchOnMount: true, // Always fetch on component mount
    retry: false, // No retry for faster fallback trigger
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  console.log('useQuery state:', {
    quiz,
    isLoadingQuiz,
    error,
    queryKey: [`/api/quizzes/${quizId}`]
  });

  // Add a manual test function
  const testAPI = async () => {
    try {
      console.log('Manual API test starting...');
      const response = await fetch(`/api/quizzes/${quizId}`);
      console.log('Manual API response:', response);
      const data = await response.json();
      console.log('Manual API data:', data);
    } catch (error) {
      console.error('Manual API error:', error);
    }
  };

  React.useEffect(() => {
    console.log('ShareQuizPage useEffect triggered');
    // Test the API manually after a short delay
    const timer = setTimeout(testAPI, 2000);
    return () => clearTimeout(timer);
  }, [quizId]);

  // Add state for timeout fallback
  const [useFallback, setUseFallback] = React.useState(false);

  // Add timer for fallback trigger
  React.useEffect(() => {
    if (isLoadingQuiz && !useFallback) {
      const fallbackTimer = setTimeout(() => {
        console.log('Triggering fallback due to slow API response');
        setUseFallback(true);
      }, 3000); // Trigger fallback after 3 seconds

      return () => clearTimeout(fallbackTimer);
    }
  }, [isLoadingQuiz, useFallback]);

  React.useEffect(() => {
    if (error) {
      console.log('Triggering fallback due to API error:', error);
      setUseFallback(true);
      toast({
        title: "Connection Issue",
        description: "Using cached quiz data...",
        variant: "default",
      });
    }
  }, [error, toast]);

  // Check for the just created quiz in session storage as fallback
  const sessionQuizId = sessionStorage.getItem("currentQuizId");
  const sessionQuizAccessCode = sessionStorage.getItem("currentQuizAccessCode");
  const sessionQuizUrlSlug = sessionStorage.getItem("currentQuizUrlSlug");
  const sessionQuizCreatorName = sessionStorage.getItem("currentQuizCreatorName");
  
  console.log("ShareQuizPage: Session storage data", { 
    sessionQuizId, 
    sessionQuizAccessCode, 
    sessionQuizUrlSlug,
    sessionQuizCreatorName,
    paramsQuizId: params.quizId,
    isLoading: isLoadingQuiz,
    hasError: !!error,
    hasQuiz: !!quiz,
    useFallback
  });

  // Use fallback data if API is slow/failing and we have session data
  const shouldUseFallback = (useFallback || error) && 
    sessionQuizId === params.quizId && 
    sessionQuizAccessCode && 
    sessionQuizUrlSlug;

  if (shouldUseFallback) {
    console.log('Using session storage fallback data');
    const fallbackQuiz = {
      id: parseInt(sessionQuizId),
      accessCode: sessionQuizAccessCode,
      urlSlug: sessionQuizUrlSlug,
      creatorName: sessionQuizCreatorName || 'Unknown Creator',
      createdAt: new Date().toISOString(),
    };
    
    return (
      <>
        <MetaTags 
          title={`${fallbackQuiz.creatorName}'s Custom Quiz`}
          description={`Take ${fallbackQuiz.creatorName}'s custom quiz! Test your knowledge and see how well you score.`}
        />
        <ShareQuiz quiz={fallbackQuiz} />
      </>
    );
  }

  if (isLoadingQuiz && !useFallback) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p>Loading your quiz...</p>
          <button 
            onClick={testAPI}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test API Manual
          </button>
        </div>
      </div>
    );
  }

  // Add debugging info
  console.log("ShareQuizPage: quiz data", { quizId, quiz, error });

  if (!quiz && !shouldUseFallback) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Quiz Not Found</h2>
          <p className="text-muted-foreground mb-4">
            Sorry, we couldn't find the quiz you're looking for (ID: {quizId}).
          </p>
          <div className="mb-4">
            <p className="text-sm text-gray-600">Debug info: session quiz ID: {sessionQuizId || 'none'}</p>
          </div>
          <a href="/" className="text-primary hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Use type assertion to help TypeScript understand the quiz structure
  const quizData = quiz as any;
  
  return (
    <>
      {/* Add meta tags for social media sharing */}
      <MetaTags 
        creatorName={quizData.creatorName}
        url={`${window.location.origin}/quiz/${quizData.accessCode}`}
        imageUrl="/favicon.png"
        title={`${quizData.creatorName}'s Custom Quiz 🧠`}
        description={`Test your knowledge with ${quizData.creatorName}'s custom quiz! Challenge yourself and see how well you score.`}
      />
      
      <ShareQuiz
        accessCode={quizData.accessCode}
        quizId={quizId}
        urlSlug={quizData.urlSlug}
      />
    </>
  );
};

export default ShareQuizPage;