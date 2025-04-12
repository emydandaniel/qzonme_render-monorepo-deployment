import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateAccessCode, generateUrlSlug } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import MultipleChoiceEditor from "./MultipleChoiceEditor";
import OpenEndedEditor from "./OpenEndedEditor";
import QuestionList from "./QuestionList";
import AdPlaceholder from "../common/AdPlaceholder";
import Layout from "../common/Layout";
import { Question } from "@shared/schema";
import { validateQuiz } from "@/lib/quizUtils";

const QuizCreation: React.FC = () => {
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"multiple-choice" | "open-ended">("multiple-choice");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [acceptedAnswers, setAcceptedAnswers] = useState("");
  const [hint, setHint] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const userId = parseInt(sessionStorage.getItem("userId") || "0");
  const userName = sessionStorage.getItem("userName") || "";

  const createQuizMutation = useMutation({
    mutationFn: async () => {
      // Create the quiz
      const quizResponse = await apiRequest("POST", "/api/quizzes", {
        creatorId: userId,
        creatorName: userName,
        accessCode: generateAccessCode(),
        urlSlug: generateUrlSlug(userName)
      });
      const quiz = await quizResponse.json();
      
      // Create all questions for the quiz
      const questionPromises = questions.map((question, index) =>
        apiRequest("POST", "/api/questions", {
          ...question,
          quizId: quiz.id,
          order: index
        })
      );
      
      await Promise.all(questionPromises);
      return quiz;
    }
  });

  const handleAddQuestion = () => {
    if (!questionText.trim()) {
      toast({
        title: "Question text is required",
        description: "Please enter a question",
        variant: "destructive"
      });
      return;
    }

    let correctAnswers: string[] = [];
    
    if (questionType === "multiple-choice") {
      // Validate multiple choice options
      if (options.some(opt => !opt.trim())) {
        toast({
          title: "All options are required",
          description: "Please fill in all options",
          variant: "destructive"
        });
        return;
      }
      correctAnswers = [options[correctOption]];
    } else {
      // Validate open-ended answers
      if (!acceptedAnswers.trim()) {
        toast({
          title: "Accepted answers are required",
          description: "Please enter at least one accepted answer",
          variant: "destructive"
        });
        return;
      }
      correctAnswers = acceptedAnswers.split(',').map(a => a.trim());
    }

    const newQuestion: Question = {
      id: Date.now(), // Temporary ID until saved to server
      quizId: 0, // Will be set when quiz is created
      text: questionText,
      type: questionType,
      options: questionType === "multiple-choice" ? options : null,
      correctAnswers,
      hint: questionType === "open-ended" ? hint : null,
      order: questions.length
    };

    setQuestions([...questions, newQuestion]);
    resetForm();
    setCurrentQuestionIndex(questions.length + 1);
  };

  const resetForm = () => {
    setQuestionText("");
    setQuestionType("multiple-choice");
    setOptions(["", "", "", ""]);
    setCorrectOption(0);
    setAcceptedAnswers("");
    setHint("");
  };

  const handleEditQuestion = (index: number) => {
    const question = questions[index];
    setQuestionText(question.text);
    setQuestionType(question.type as "multiple-choice" | "open-ended");
    
    if (question.type === "multiple-choice" && question.options) {
      setOptions(question.options as string[]);
      setCorrectOption((question.options as string[]).findIndex(
        opt => opt === (question.correctAnswers as string[])[0]
      ));
    } else {
      setAcceptedAnswers((question.correctAnswers as string[]).join(", "));
      setHint(question.hint || "");
    }
    
    // Remove the question from the list
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
    setCurrentQuestionIndex(index);
  };

  const handleDeleteQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleFinishQuiz = async () => {
    if (!validateQuiz(questions)) {
      toast({
        title: "More questions needed",
        description: "Your quiz needs at least 5 questions",
        variant: "destructive"
      });
      return;
    }

    try {
      const quiz = await createQuizMutation.mutateAsync();
      sessionStorage.setItem("currentQuizId", quiz.id.toString());
      sessionStorage.setItem("currentQuizAccessCode", quiz.accessCode);
      sessionStorage.setItem("currentQuizUrlSlug", quiz.urlSlug);
      navigate(`/dashboard/${quiz.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create quiz. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Calculate progress dots
  const progressDots = Array(5).fill(null).map((_, i) => 
    i < Math.min(currentQuestionIndex + 1, 5)
  );

  return (
    <Layout>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-poppins">Create Your Quiz</h2>
            <span className="text-sm text-muted-foreground">Min. 5 questions</span>
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
          
          {/* Question Editor */}
          <div className="question-container">
            <div className="mb-4">
              <Label htmlFor="question-text" className="block text-sm font-medium mb-1">
                Question
              </Label>
              <Input
                type="text"
                id="question-text"
                className="input-field"
                placeholder="Ask something about yourself..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <Label className="block text-sm font-medium mb-2">Question Type</Label>
              <RadioGroup
                value={questionType}
                onValueChange={(val) => setQuestionType(val as "multiple-choice" | "open-ended")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple-choice" id="multiple-choice" />
                  <Label htmlFor="multiple-choice">Multiple Choice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="open-ended" id="open-ended" />
                  <Label htmlFor="open-ended">Open-Ended</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Question type specific editors */}
            {questionType === "multiple-choice" ? (
              <MultipleChoiceEditor
                options={options}
                setOptions={setOptions}
                correctOption={correctOption}
                setCorrectOption={setCorrectOption}
              />
            ) : (
              <OpenEndedEditor
                acceptedAnswers={acceptedAnswers}
                setAcceptedAnswers={setAcceptedAnswers}
                hint={hint}
                setHint={setHint}
              />
            )}
          </div>
          
          <div className="flex justify-between mt-6">
            <Button 
              type="button" 
              className="btn-secondary" 
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button 
              type="button" 
              className="btn-primary" 
              onClick={handleAddQuestion}
            >
              {questions.length > 0 ? "Add Question" : "First Question"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Questions List */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-poppins font-semibold text-lg mb-3">Your Questions</h3>
          <QuestionList 
            questions={questions} 
            onEdit={handleEditQuestion}
            onDelete={handleDeleteQuestion}
          />
          
          {/* Finalize and Share section */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {questions.length} of 5 questions added
              </span>
              <Button
                type="button"
                className={questions.length >= 5 ? "btn-primary" : "btn-disabled"}
                disabled={questions.length < 5 || createQuizMutation.isPending}
                onClick={handleFinishQuiz}
              >
                {createQuizMutation.isPending ? "Creating..." : "Finish & Share"}
              </Button>
            </div>
          </div>

          {/* Ad Placeholder */}
          <AdPlaceholder />
        </CardContent>
      </Card>
    </Layout>
  );
};

export default QuizCreation;
