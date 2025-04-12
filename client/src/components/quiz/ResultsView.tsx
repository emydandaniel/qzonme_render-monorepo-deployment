import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Question, QuestionAnswer, QuizAttempt } from "@shared/schema";
import { formatPercentage } from "@/lib/utils";
import Leaderboard from "../common/Leaderboard";
import AdPlaceholder from "../common/AdPlaceholder";
import Layout from "../common/Layout";
import { Check, X } from "lucide-react";

interface ResultsViewProps {
  userName: string;
  quizCreator: string;
  questions: Question[];
  answers: QuestionAnswer[];
  attempts: QuizAttempt[];
  score: number;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  userName,
  quizCreator,
  questions,
  answers,
  attempts,
  score
}) => {
  const [, navigate] = useLocation();
  const percentage = formatPercentage(score, questions.length);
  
  const handleCreateOwnQuiz = () => {
    navigate("/create");
  };
  
  const handleTryAgain = () => {
    // Get the quiz access code from the URL or session storage
    const accessCode = window.location.pathname.split("/").pop() || "";
    navigate(`/quiz/${accessCode}`);
  };
  
  // Match questions with answers for display
  const questionAnswers = questions.map(question => {
    const answer = answers.find(a => a.questionId === question.id);
    return {
      question,
      answer
    };
  });
  
  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{percentage}</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 font-poppins">
              Great Job, {userName}!
            </h2>
            <p className="text-muted-foreground">
              You scored {score} out of {questions.length} on {quizCreator}'s quiz
            </p>
          </div>
          
          {/* Results Summary */}
          <div className="mb-6">
            <h3 className="font-poppins font-semibold text-lg mb-3">Your Answers</h3>
            <ul className="space-y-3">
              {questionAnswers.map(({ question, answer }) => (
                <li 
                  key={question.id} 
                  className={`p-3 rounded-lg border-l-4 ${
                    answer?.isCorrect 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{question.text}</span>
                    {answer?.isCorrect ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    You answered: {answer?.userAnswer.toString()}
                  </div>
                  {!answer?.isCorrect && (
                    <div className="text-sm text-red-600 mt-1">
                      Correct answer: {(question.correctAnswers as string[]).join(" or ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Leaderboard */}
          <div className="mt-8">
            <h3 className="font-poppins font-semibold text-lg mb-3">Leaderboard</h3>
            <Leaderboard attempts={attempts} currentUserName={userName} />
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row justify-center sm:space-x-4 space-y-3 sm:space-y-0">
            <Button 
              type="button" 
              className="btn-primary" 
              onClick={handleCreateOwnQuiz}
            >
              Create My Own Quiz
            </Button>
            <Button 
              type="button" 
              className="btn-secondary" 
              onClick={handleTryAgain}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Ad Placeholder */}
      <AdPlaceholder />
    </Layout>
  );
};

export default ResultsView;
