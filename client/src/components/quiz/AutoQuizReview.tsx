import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Question } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft, Edit, Save, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AutoQuizReviewProps {
  questions: Question[];
  onQuestionsUpdated: (questions: Question[]) => void;
  onReviewComplete: () => void;
}

const AutoQuizReview: React.FC<AutoQuizReviewProps> = ({
  questions,
  onQuestionsUpdated,
  onReviewComplete
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewedQuestions, setReviewedQuestions] = useState<Set<number>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const canProceed = reviewedQuestions.has(currentQuestion?.id || 0);
  const allReviewed = reviewedQuestions.size === totalQuestions;

  // Initialize edit form when starting to edit
  useEffect(() => {
    if (isEditing && currentQuestion) {
      setEditedQuestion({ ...currentQuestion });
    }
  }, [isEditing, currentQuestion]);

  // Auto-mark current question as reviewed when user views it
  useEffect(() => {
    if (currentQuestion && !isEditing) {
      // Automatically mark the question as reviewed after a brief delay
      const timer = setTimeout(() => {
        setReviewedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.add(currentQuestion.id);
          return newSet;
        });
      }, 1000); // 1 second delay to ensure user sees the content

      return () => clearTimeout(timer);
    }
  }, [currentQuestion, isEditing]);

  const handleNext = () => {
    if (!canProceed) {
      toast({
        title: "Review Required",
        description: "Please review this question before proceeding.",
        variant: "destructive"
      });
      return;
    }

    if (isLastQuestion) {
      // All questions reviewed, proceed to finish
      onReviewComplete();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsEditing(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editedQuestion) return;

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = editedQuestion;
    onQuestionsUpdated(updatedQuestions);

    // Mark as reviewed since user edited it
    setReviewedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.add(editedQuestion.id);
      return newSet;
    });

    setIsEditing(false);
    toast({
      title: "Question Updated",
      description: "Your changes have been saved.",
      variant: "default"
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedQuestion(null);
  };

  const updateEditedQuestion = (field: string, value: any) => {
    if (!editedQuestion) return;
    
    setEditedQuestion(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const updateOption = (optionIndex: number, value: string) => {
    if (!editedQuestion || !editedQuestion.options) return;
    
    const newOptions = [...editedQuestion.options];
    newOptions[optionIndex] = value;
    
    setEditedQuestion(prev => ({
      ...prev!,
      options: newOptions
    }));
  };

  const setCorrectAnswer = (optionIndex: number) => {
    if (!editedQuestion || !editedQuestion.options) return;
    
    const correctAnswer = editedQuestion.options[optionIndex];
    setEditedQuestion(prev => ({
      ...prev!,
      correctAnswers: [correctAnswer]
    }));
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No questions to review</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <CardTitle>Review AI-Generated Questions</CardTitle>
            </div>
            <Badge variant="secondary">
              {currentQuestionIndex + 1} of {totalQuestions}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{reviewedQuestions.size} questions reviewed</span>
            {!allReviewed && (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-500 ml-2" />
                <span>{totalQuestions - reviewedQuestions.size} remaining</span>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Question Review Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}
              {reviewedQuestions.has(currentQuestion.id) && (
                <CheckCircle className="h-5 w-5 text-green-500 inline ml-2" />
              )}
            </CardTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-4">
              <div>
                <Label htmlFor="question-text">Question Text</Label>
                <Textarea
                  id="question-text"
                  value={editedQuestion?.text || ''}
                  onChange={(e) => updateEditedQuestion('text', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {editedQuestion?.options && (
                <div className="space-y-3">
                  <Label>Answer Options</Label>
                  {editedQuestion.options.map((option, index) => {
                    const isCorrect = editedQuestion.correctAnswers?.includes(option);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className={isCorrect ? 'border-green-500 bg-green-50' : ''}
                          />
                        </div>
                        <Button
                          type="button"
                          variant={isCorrect ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCorrectAnswer(index)}
                          className={isCorrect ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {isCorrect ? 'Correct' : 'Set as Correct'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-4">
              {/* Question Image */}
              {currentQuestion.imageUrl && (
                <div className="w-full max-w-md mx-auto">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question image"
                    className="w-full h-auto rounded-lg border"
                  />
                </div>
              )}

              {/* Question Text */}
              <div className="text-lg font-medium">
                {currentQuestion.text}
              </div>

              {/* Answer Options */}
              {currentQuestion.options && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Answer Options:</Label>
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = currentQuestion.correctAnswers?.includes(option);
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          isCorrect
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <span>{option}</span>
                          {isCorrect && (
                            <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              {reviewedQuestions.has(currentQuestion.id) ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Question reviewed
                </div>
              ) : (
                <div className="text-yellow-600">
                  Reviewing automatically...
                </div>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={!canProceed && !isEditing}
              className="gap-2"
            >
              {isLastQuestion ? 'Complete Review' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoQuizReview;
