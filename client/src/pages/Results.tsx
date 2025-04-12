import React from "react";
import { useQuery } from "@tanstack/react-query";
import ResultsView from "@/components/quiz/ResultsView";

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

  // Fetch this specific attempt
  const { data: thisAttempt, isLoading: isLoadingAttempt } = useQuery({
    queryKey: [`/api/quiz-attempts/${attemptId}`],
    enabled: !!attemptId,
  });

  if (
    isLoadingQuiz ||
    isLoadingQuestions ||
    isLoadingAttempts ||
    isLoadingAttempt
  ) {
    return <div>Loading results...</div>;
  }

  if (!quiz || !thisAttempt) {
    return <div>Results not found</div>;
  }

  return (
    <ResultsView
      userName={userName}
      quizCreator={quiz.creatorName}
      questions={questions}
      answers={thisAttempt.answers}
      attempts={attempts}
      score={thisAttempt.score}
    />
  );
};

export default Results;
