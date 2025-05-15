import React from "react";
import QuizCreationNew from "@/components/quiz/QuizCreationNew";
import MetaTags from "@/components/common/MetaTags";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/common/Layout";

const CreateQuiz: React.FC = () => {
  return (
    <>
      <MetaTags 
        title="Create a Quiz | QzonMe - Test Your Friends" 
        description="Create a personalized quiz that tests how well your friends know you. Add multiple-choice questions, images, and share with friends in minutes!"
        type="website"
      />
      <div className="hidden md:block">
        <Layout>
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Create Your Personalized Quiz</h1>
                <p className="text-muted-foreground mb-4">
                  Create a fun quiz that tests how well your friends really know you. Add multiple-choice questions, 
                  include images, and challenge your friends to see their score on the leaderboard.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <span className="inline-block w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-2">1</span>
                  <h3 className="font-medium mb-1">Create Questions</h3>
                  <p className="text-sm text-muted-foreground">Add multiple-choice questions about yourself</p>
                </div>
                
                <div className="bg-muted rounded-lg p-4 text-center">
                  <span className="inline-block w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-2">2</span>
                  <h3 className="font-medium mb-1">Add Images</h3>
                  <p className="text-sm text-muted-foreground">Make your quiz more personal with pictures</p>
                </div>
                
                <div className="bg-muted rounded-lg p-4 text-center">
                  <span className="inline-block w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-2">3</span>
                  <h3 className="font-medium mb-1">Share With Friends</h3>
                  <p className="text-sm text-muted-foreground">Send your quiz link and see who knows you best</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Layout>
      </div>
      
      {/* The actual quiz creation component */}
      <QuizCreationNew />
    </>
  );
};

export default CreateQuiz;
