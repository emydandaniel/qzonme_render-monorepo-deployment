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
  const quizId = parseInt(params.quizId);
  const { toast } = useToast();

  // Check session storage first, before making API calls
  const sessionQuizId = sessionStorage.getItem("currentQuizId");
  const sessionQuizAccessCode = sessionStorage.getItem("currentQuizAccessCode");
  const sessionQuizUrlSlug = sessionStorage.getItem("currentQuizUrlSlug");
  
  console.log("ShareQuizPage mounted:", { params, quizId, isValidQuizId: !isNaN(quizId) && quizId > 0 });
  console.log("Session storage data:", { 
    sessionQuizId, 
    sessionQuizAccessCode, 
    sessionQuizUrlSlug,
    paramsQuizId: params.quizId,
    matches: sessionQuizId === params.quizId
  });

  // If we have session data for this quiz, use it immediately and skip API call
  const hasSessionData = sessionQuizId && sessionQuizId === params.quizId && sessionQuizAccessCode && sessionQuizUrlSlug;
  
  if (hasSessionData) {
    console.log("Using session storage fallback for quiz data - skipping API call");
    return (
      <ShareQuiz
        accessCode={sessionQuizAccessCode}
        quizId={quizId}
        urlSlug={sessionQuizUrlSlug}
      />
    );
  }

  // Only make API call if we don't have session data
  const { data: quiz, isLoading: isLoadingQuiz, error } = useQuery<{
    id: number;
    accessCode: string;
    urlSlug: string;
    creatorName: string;
    createdAt: string;
  }>({
    queryKey: [`/api/quizzes/${quizId}`],
    queryFn: async () => {
      console.log(`Making API call to /api/quizzes/${quizId}`);
      const response = await fetch(`/api/quizzes/${quizId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch quiz: ${response.status}`);
      }
      return response.json();
    },
    enabled: !isNaN(quizId) && quizId > 0 && !hasSessionData, // Only run if no session data
    staleTime: 0, // Don't use cached data
    refetchOnMount: true, // Always fetch on component mount
  });

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
        </div>
      </div>
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
        description={`Test your knowledge of ${quizData.creatorName}! Take this fun interactive quiz to see how well you really know them.`}
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