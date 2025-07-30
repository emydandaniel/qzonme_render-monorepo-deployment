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

  // Fetch quiz with proper type
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
      const response = await fetch(`/api/quizzes/${quizId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}):`, errorText);
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`API Success for quiz ${quizId}:`, data);
      return data;
    },
    staleTime: 0, // Don't use cached data
    refetchOnMount: true, // Always fetch on component mount
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

  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load quiz. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoadingQuiz) {
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
  
  // Check for the just created quiz in session storage as fallback
  const sessionQuizId = sessionStorage.getItem("currentQuizId");
  const sessionQuizAccessCode = sessionStorage.getItem("currentQuizAccessCode");
  const sessionQuizUrlSlug = sessionStorage.getItem("currentQuizUrlSlug");
  
  // If quiz from API failed but we have session data, use that
  if (!quiz && sessionQuizId && sessionQuizId === params.quizId && sessionQuizAccessCode && sessionQuizUrlSlug) {
    console.log("Using session storage fallback for quiz data");
    return (
      <ShareQuiz
        accessCode={sessionQuizAccessCode}
        quizId={quizId}
        urlSlug={sessionQuizUrlSlug}
      />
    );
  }

  if (!quiz) {
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
      {/* Add meta tags for WhatsApp link sharing */}
      <MetaTags 
        creatorName={quizData.creatorName}
        url={`${window.location.origin}/quiz/${quizData.accessCode}`}
        imageUrl="/favicon.png"
        title={`${quizData.creatorName}'s Quiz Just for You 💬`}
        description={`How well do you know ${quizData.creatorName}? Try this private QzonMe quiz they made just for close friends.`}
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