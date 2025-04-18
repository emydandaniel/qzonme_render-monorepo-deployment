import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Layout from "@/components/common/Layout";
import { ArrowLeft } from "lucide-react";

const About: React.FC = () => {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center text-primary" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Button>
          </div>
          
          <div className="prose prose-sm max-w-none text-center">
            <h1 className="text-2xl font-bold mb-4">What is QzonMe?</h1>
            
            <p className="mb-4">
              QzonMe is a fun quiz-based website that lets you test how well your friends know you! 
              You can create custom quizzes, challenge your friends, and see who knows you best on the leaderboard.
            </p>
            
            <p className="mb-6">
              Built by students, for laughs and good vibes 🧡<br/>
              Have fun, and don't forget to share your quiz!
            </p>
            
            <div className="flex justify-center gap-4 mt-8">
              <Button
                onClick={() => navigate("/create")}
                variant="default"
              >
                Create a Quiz
              </Button>
              
              <Button
                onClick={() => navigate("/find")}
                variant="outline"
              >
                Take a Quiz
              </Button>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Button 
              onClick={() => navigate("/")}
              className="w-full sm:w-auto"
            >
              Return to QzonMe
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default About;