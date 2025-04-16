import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateAccessCode, generateUrlSlug } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image, Loader2, Upload, X } from "lucide-react";
import MultipleChoiceEditor from "./MultipleChoiceEditor";
import QuestionList from "./QuestionList";
import AdPlaceholder from "../common/AdPlaceholder";
import Layout from "../common/Layout";
import { Question } from "@shared/schema";
import { validateQuiz } from "@/lib/quizUtils";

const QuizCreation: React.FC = () => {
  const [questionText, setQuestionText] = useState("");
  const [questionType] = useState<"multiple-choice">("multiple-choice");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(0);
  // Image handling for questions (to be implemented)
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const userId = parseInt(sessionStorage.getItem("userId") || "0");
  const userName = sessionStorage.getItem("userName") || "";

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      return response.json();
    }
  });

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

  const handleAddQuestion = async () => {
    if (!questionText.trim()) {
      toast({
        title: "Question text is required",
        description: "Please enter a question",
        variant: "destructive"
      });
      return;
    }

    let correctAnswers: string[] = [];
    
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

    try {
      // Handle image upload if present
      let imageUrl = null;
      if (questionImage) {
        try {
          const uploadResult = await uploadImageMutation.mutateAsync(questionImage);
          imageUrl = uploadResult.imageUrl;
        } catch (err) {
          console.error("Failed to upload image:", err);
          toast({
            title: "Image upload failed",
            description: "Your question will be added without the image",
            variant: "destructive"
          });
          // Fallback to no image
          imageUrl = null;
        }
      }

      const newQuestion: Question = {
        id: Date.now(), // Temporary ID until saved to server
        quizId: 0, // Will be set when quiz is created
        text: questionText,
        type: questionType,
        options: options,
        correctAnswers,
        hint: null,
        order: questions.length,
        imageUrl: imageUrl
      };

      setQuestions([...questions, newQuestion]);
      resetForm();
      setCurrentQuestionIndex(questions.length + 1);
      
      toast({
        title: questionImage ? "Question with image added" : "Question added",
        description: "Your question has been added to the quiz",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setQuestionImage(file);
      const imageUrl = URL.createObjectURL(file);
      setQuestionImagePreview(imageUrl);
    }
  };
  
  const handleRemoveImage = () => {
    setQuestionImage(null);
    if (questionImagePreview) {
      URL.revokeObjectURL(questionImagePreview);
      setQuestionImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectOption(0);
    handleRemoveImage();
  };

  const handleEditQuestion = (index: number) => {
    const question = questions[index];
    setQuestionText(question.text);
    
    if (question.options) {
      setOptions(question.options as string[]);
      setCorrectOption((question.options as string[]).findIndex(
        opt => opt === (question.correctAnswers as string[])[0]
      ));
    }
    
    // Handle editing a question with an image
    if (question.imageUrl) {
      // For data URLs, we can use them directly
      if (question.imageUrl.startsWith('data:')) {
        setQuestionImagePreview(question.imageUrl);
      } 
      // For remote URLs, we'd need to handle differently
      else {
        setQuestionImagePreview(question.imageUrl);
      }
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
      // If we're creating a new question, save the current data first
      if (questionText.trim() || options.some(o => o.trim())) {
        toast({
          title: "Save changes?",
          description: "Please add the current question first or clear the form",
          variant: "destructive"
        });
        return;
      }
      
      // Load the previous question
      const prevIndex = currentQuestionIndex - 1;
      if (prevIndex >= 0 && prevIndex < questions.length) {
        const prevQuestion = questions[prevIndex];
        
        // Load the question data into the form
        setQuestionText(prevQuestion.text);
        
        if (prevQuestion.options) {
          setOptions(prevQuestion.options as string[]);
          // Find which option is the correct one
          const correctIndex = (prevQuestion.options as string[]).findIndex(
            opt => (prevQuestion.correctAnswers as string[]).includes(opt)
          );
          setCorrectOption(correctIndex >= 0 ? correctIndex : 0);
        }
        
        // Handle question image if present
        if (prevQuestion.imageUrl) {
          setQuestionImagePreview(prevQuestion.imageUrl);
        } else {
          handleRemoveImage();
        }
        
        // Remove the question from the list
        const updatedQuestions = [...questions];
        updatedQuestions.splice(prevIndex, 1);
        setQuestions(updatedQuestions);
        
        // Update current index
        setCurrentQuestionIndex(prevIndex);
      }
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
      navigate(`/share/${quiz.id}`);
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
            
            {/* Image upload area */}
            <div className="mb-6">
              <Label className="block text-sm font-medium mb-2">
                Question Image (Optional)
              </Label>
              
              {questionImagePreview ? (
                <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden mb-2">
                  <img 
                    src={questionImagePreview} 
                    alt="Question preview" 
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-primary transition-colors mb-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <Image className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-600 mb-1">Click to upload an image</p>
                    <p className="text-xs text-gray-500">PNG, JPG or GIF (max. 5MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              )}
            </div>
            
            {/* Multiple choice editor (open-ended removed) */}
            <MultipleChoiceEditor
              options={options}
              setOptions={setOptions}
              correctOption={correctOption}
              setCorrectOption={setCorrectOption}
            />
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
              disabled={uploadImageMutation.isPending}
            >
              {uploadImageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                questions.length > 0 ? "Add Question" : "First Question"
              )}
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
