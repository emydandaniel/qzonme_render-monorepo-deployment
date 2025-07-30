import React from "react";
import { Question } from "@shared/schema";
import { Edit, Trash2, Image as ImageIcon, CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface QuestionListProps {
  questions: Question[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  reviewedQuestions?: Set<number>;
  requiresReview?: boolean;
  onMarkAsReviewed?: (questionId: number) => void;
  isInAutoReviewMode?: boolean; // New prop to disable manual review
}

const QuestionList: React.FC<QuestionListProps> = ({ 
  questions, 
  onEdit, 
  onDelete,
  reviewedQuestions,
  requiresReview,
  onMarkAsReviewed,
  isInAutoReviewMode
}) => {
  if (questions.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No questions added yet. Start by creating your first question.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {questions.map((question, index) => {
        const isReviewed = reviewedQuestions?.has(question.id) || false;
        const needsReview = requiresReview && !isReviewed;
        
        return (
          <li 
            key={index} 
            className={`p-3 rounded-lg flex justify-between items-center ${
              needsReview ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Review Status Badge */}
              {requiresReview && (
                <Badge 
                  variant={isReviewed ? "default" : "secondary"}
                  className={isReviewed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                >
                  {isReviewed ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Reviewed
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Needs Review
                    </>
                  )}
                </Badge>
              )}
              
              {question.imageUrl && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative w-8 h-8 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                        <img 
                          src={question.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This question has an image</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className={needsReview ? "font-medium" : ""}>{question.text}</span>
            </div>
            <div className="flex space-x-2">
              {question.imageUrl && (
                <ImageIcon className="h-5 w-5 text-green-500 mr-1" />
              )}
              
              {/* Mark as Reviewed Button - DISABLED during auto-review mode */}
              {needsReview && onMarkAsReviewed && !isInAutoReviewMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onMarkAsReviewed(index)}
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark as reviewed</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Show disabled eye icon during auto-review mode for visual consistency */}
              {needsReview && isInAutoReviewMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        className="text-gray-400 cursor-not-allowed opacity-50"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sequential review in progress - use the form above</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(index)}
                className="text-muted-foreground hover:text-primary"
              >
                <Edit className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(index)}
                className="text-muted-foreground hover:text-primary"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default QuestionList;
