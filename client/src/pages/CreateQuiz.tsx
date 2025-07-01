import React from "react";
import QuizCreationNew from "@/components/quiz/QuizCreationNew";
import MetaTags from "@/components/common/MetaTags";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/common/Layout";

const CreateQuiz: React.FC = () => {
  return (
    <Layout>
      <MetaTags 
        title="Create Any Quiz | QzonMe - Universal Quiz Builder" 
        description="Create any type of quiz in minutes! Build personal friendship tests, trivia challenges, classroom games, family quizzes, or fandom tests. Add images and share instantly!"
        type="website"
      />
      
      {/* Create Quiz Heading */}
      <h1 className="text-3xl font-bold mb-6">Create Any Quiz</h1>
      
      {/* SEO Content */}
      <div className="mb-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="mb-4">
              Ready to create your custom quiz? Whether it's a personal friendship test, trivia challenge, classroom game, or fandom quiz, you can build it in just a few minutes:
            </p>
            <ol className="list-decimal pl-5 mb-4 space-y-2">
              <li>Choose your quiz topic - personal questions, trivia, educational content, or any subject you love</li>
              <li>Add multiple-choice questions with up to 4 answer options</li>
              <li>Upload images to make your quiz more engaging and visual</li>
              <li>Customize with your name and get instant sharing links</li>
              <li>Watch participants compete and see who scores highest on your leaderboard</li>
            </ol>
            <p className="text-muted-foreground">
              Your quiz will remain active for 7 days, giving everyone plenty of time to participate. No account required - just create and share!
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* The actual quiz creation component */}
      <QuizCreationNew />
    </Layout>
  );
};

export default CreateQuiz;
