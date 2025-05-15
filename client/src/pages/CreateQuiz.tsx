import React from "react";
import QuizCreationNew from "@/components/quiz/QuizCreationNew";
import MetaTags from "@/components/common/MetaTags";
import { Card, CardContent } from "@/components/ui/card";

const CreateQuiz: React.FC = () => {
  return (
    <>
      <MetaTags 
        title="Create a Quiz | QzonMe - Test Your Friends" 
        description="Create a personalized quiz that tests how well your friends know you. Add multiple-choice questions, images, and share with friends in minutes!"
        type="website"
      />
      
      {/* The actual quiz creation component */}
      <QuizCreationNew />
    </>
  );
};

export default CreateQuiz;
