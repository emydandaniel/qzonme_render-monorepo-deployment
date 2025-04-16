import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Question, QuestionAnswer, QuizAttempt } from "@shared/schema";
import { formatPercentage, getRemarkByScore } from "@/lib/utils";
import Leaderboard from "../common/Leaderboard";
import AdPlaceholder from "../common/AdPlaceholder";
import Layout from "../common/Layout";
import { Check, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  
  const [showAnswers, setShowAnswers] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const personalizedRemark = getRemarkByScore(score, questions.length);
  const { toast } = useToast();
  
  // Removed shared URL section as this component no longer needs it
  
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareMessage)
      .then(() => {
        setCopied(true);
        toast({
          title: "Copied!",
          description: "Now paste it to your friend 👌🏽",
          duration: 3000
        });
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => {
        console.error('Error copying text: ', err);
        toast({
          title: "Couldn't copy",
          description: "Please try again or copy manually",
          variant: "destructive"
        });
      });
  };
  
  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{percentage}</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 font-poppins">
              {personalizedRemark}
            </h2>
            <p className="text-muted-foreground">
              You scored {score} out of {questions.length} on {quizCreator}'s quiz
            </p>
          </div>
          
          {/* Results Summary - Hidden by default */}
          <div className="mb-6 text-center">
            <Button 
              type="button" 
              className="mb-4" 
              onClick={() => setShowAnswers(!showAnswers)}
            >
              {showAnswers ? "Hide Your Answers" : "View Your Answers"}
            </Button>
            
            {showAnswers && (
              <div className="mt-4">
                <h3 className="font-poppins font-semibold text-lg mb-3 text-left">Your Answers</h3>
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
            )}
          </div>
          
          {/* Share box removed as requested */}
          
          {/* Leaderboard */}
          <div className="mt-8">
            <h3 className="font-poppins font-semibold text-lg mb-3">Leaderboard</h3>
            <Leaderboard attempts={attempts} currentUserName={userName} />
          </div>
          
          <div className="mt-8 flex justify-center">
            <Button 
              type="button" 
              className="btn-primary" 
              onClick={handleCreateOwnQuiz}
            >
              Create My Own Quiz
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
