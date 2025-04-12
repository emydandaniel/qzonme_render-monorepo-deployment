import React from "react";
import { useQuery } from "@tanstack/react-query";
import ShareQuiz from "@/components/quiz/ShareQuiz";
import { useToast } from "@/hooks/use-toast";

interface ShareQuizPageProps {
  params: {
    quizId: string;
  };
}

const ShareQuizPage: React.FC<ShareQuizPageProps> = ({ params }) => {
  const quizId = parseInt(params.quizId);
  const { toast } = useToast();

  // Fetch quiz
  const { data: quiz, isLoading: isLoadingQuiz, error } = useQuery({
    queryKey: [`/api/quizzes/${quizId}`],
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
            Sorry, we couldn't find the quiz you're looking for.
          </p>
          <a href="/" className="text-primary hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <ShareQuiz
      accessCode={quiz.accessCode}
      quizId={quizId}
      urlSlug={quiz.urlSlug}
    />
  );
};

export default ShareQuizPage;