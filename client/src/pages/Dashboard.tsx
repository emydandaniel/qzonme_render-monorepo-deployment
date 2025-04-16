import React from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardView from "@/components/quiz/Dashboard";
import ShareQuiz from "@/components/quiz/ShareQuiz";

interface DashboardProps {
  params: {
    quizId: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ params }) => {
  const quizId = parseInt(params.quizId);
  const [showShareView, setShowShareView] = React.useState(false);

  // We no longer want to show the share view when coming to dashboard
  // The share view is only shown after quiz creation
  React.useEffect(() => {
    setShowShareView(false);
  }, [params.quizId]);

  // Fetch quiz
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery({
    queryKey: [`/api/quizzes/${quizId}`],
  });

  // Fetch questions
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: [`/api/quizzes/${quizId}/questions`],
    enabled: !!quizId,
  });

  // Fetch quiz attempts
  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: [`/api/quizzes/${quizId}/attempts`],
    enabled: !!quizId,
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
