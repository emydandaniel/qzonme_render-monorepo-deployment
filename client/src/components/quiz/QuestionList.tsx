import React from "react";
import { Question } from "@shared/schema";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestionListProps {
  questions: Question[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

const QuestionList: React.FC<QuestionListProps> = ({ 
  questions, 
  onEdit, 
  onDelete 
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
      {questions.map((question, index) => (
        <li 
          key={index} 
          className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"
        >
          <span>{question.text}</span>
          <div className="flex space-x-2">
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
      ))}
    </ul>
  );
};

export default QuestionList;
