import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Question, QuestionAnswer } from "@shared/schema";
import { createAvatarPlaceholder, showAdInterstitial } from "@/lib/utils";
import { verifyAnswer } from "@/lib/quizUtils";
import { apiRequest } from "@/lib/queryClient";
import AdPlaceholder from "../common/AdPlaceholder";
import Layout from "../common/Layout";
import { Info } from "lucide-react";

interface QuizAnswerProps {
  quizId: number;
  quizCreator: string;
  questions: Question[];
  onComplete: (answers: QuestionAnswer[], score: number) => void;
}

const QuizAnswer: React.FC<QuizAnswerProps> = ({ 
  quizId, 
  quizCreator, 
  questions, 
  onComplete 
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<QuestionAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [openEndedAnswer, setOpenEndedAnswer] = useState<string>("");
  const { toast } = useToast();
  
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  // Calculate progress dots (maximum 5 dots)
  const progressDots = Array(Math.min(questions.length, 5))
    .fill(null)
    .map((_, i) => i <= currentQuestionIndex);
  
  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };
  
  const verifyAnswerMutation = useMutation({
    mutationFn: async (answer: string | string[]) => {
      const result = await verifyAnswer(currentQuestion.id, answer);
      return result;
    }
  });
  
  const handleNext = async () => {
    // Check if an answer is selected/entered
    if (currentQuestion.type === "multiple-choice" && !selectedOption) {
      toast({
        title: "Please select an answer",
        description: "You must select an option to continue",
        variant: "destructive"
      });
      return;
    }
    
    if (currentQuestion.type === "open-ended" && !openEndedAnswer.trim()) {
      toast({
        title: "Please enter an answer",
        description: "You must provide an answer to continue",
        variant: "destructive"
      });
      return;
    }
    
    const answer = currentQuestion.type === "multiple-choice" 
      ? selectedOption 
      : openEndedAnswer.trim();
    
    try {
      // Verify if the answer is correct
      const isCorrect = await verifyAnswerMutation.mutateAsync(answer);
      
      // Save the answer
      const questionAnswer: QuestionAnswer = {
        questionId: currentQuestion.id,
        userAnswer: answer,
        isCorrect
      };
      
      const updatedAnswers = [...userAnswers, questionAnswer];
      setUserAnswers(updatedAnswers);
      
      // Reset inputs for next question
      setSelectedOption("");
      setOpenEndedAnswer("");
      
      // Show interstitial ad every 5 questions
      if ((currentQuestionIndex + 1) % 5 === 0) {
        showAdInterstitial();
      }
      
      // If this was the last question, complete the quiz
      if (isLastQuestion) {
        const score = updatedAnswers.filter(a => a.isCorrect).length;
        onComplete(updatedAnswers, score);
      } else {
        // Move to next question
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      // Remove the last answer
      const updatedAnswers = [...userAnswers];
      updatedAnswers.pop();
      setUserAnswers(updatedAnswers);
      
      // Go back to previous question
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  if (!currentQuestion) {
    return <div>Loading questions...</div>;
  }
  
  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          {/* Quiz Creator Info */}
          <div className="flex items-center mb-6">
            <div 
              className="w-10 h-10 rounded-full bg-primary bg-opacity-20 flex items-center justify-center text-primary font-semibold"
            >
              {createAvatarPlaceholder(quizCreator)}
            </div>
            <div className="ml-3">
              <h2 className="font-poppins font-semibold">{quizCreator}'s Quiz</h2>
              <p className="text-sm text-muted-foreground">
                Let's see how well you know {quizCreator}
              </p>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2 mb-6">
            {progressDots.map((isActive, i) => (
              <div 
                key={i} 
                className={`progress-dot ${isActive ? 'active' : ''}`}
              ></div>
            ))}
          </div>
          
          {/* Question container */}
          <div className="question-container">
            <div className="text-center mb-6">
              <h3 className="text-xl font-poppins font-semibold mb-2">
                {currentQuestion.text}
              </h3>
            </div>
            
            {/* Multiple choice question */}
            {currentQuestion.type === "multiple-choice" && (
              <div className="space-y-3">
                {(currentQuestion.options as string[]).map((option, index) => (
                  <label 
                    key={index}
                    className={`block p-3 bg-white border ${
                      selectedOption === option ? 'border-primary' : 'border-gray-200'
                    } rounded-lg hover:border-primary cursor-pointer transition-colors`}
                    onClick={() => handleOptionSelect(option)}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full ${
                        selectedOption === option ? 'bg-primary' : 'border-2 border-gray-300'
                      } mr-3 flex-shrink-0`}></div>
                      <span>{option}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {/* Open-ended question */}
            {currentQuestion.type === "open-ended" && (
              <div>
                <div className="mb-6">
                  <Input
                    type="text"
                    className="input-field"
                    placeholder="Type your answer here..."
                    value={openEndedAnswer}
                    onChange={(e) => setOpenEndedAnswer(e.target.value)}
                  />
                </div>
                
                {currentQuestion.hint && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4 flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      Hint: {currentQuestion.hint}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-6">
            <Button 
              type="button" 
              className="btn-secondary" 
              onClick={handleBack}
              disabled={currentQuestionIndex === 0 || verifyAnswerMutation.isPending}
            >
              Back
            </Button>
            <Button 
              type="button" 
              className="btn-primary" 
              onClick={handleNext}
              disabled={verifyAnswerMutation.isPending}
            >
              {isLastQuestion ? "Submit" : "Next Question"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Ad Placeholder */}
      <AdPlaceholder />
    </Layout>
  );
};

export default QuizAnswer;
