import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AdPlaceholder from "@/components/common/AdPlaceholder";
import Layout from "@/components/common/Layout";

const FindQuiz: React.FC = () => {
  const [quizLink, setQuizLink] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quizLink.trim()) {
      toast({
        title: "Quiz link required",
        description: "Please enter a quiz link to continue",
        variant: "destructive"
      });
      return;
    }
    
    // Try to extract the quiz creator slug from the link
    try {
      // Handle both full URLs and just slugs
      let slug = "";
      
      if (quizLink.includes("/quiz/")) {
        // Extract the slug from a full URL like "qzonme.com/quiz/username-abc123"
        const urlParts = quizLink.split("/quiz/");
        slug = urlParts[urlParts.length - 1].trim();
      } else {
        // Treat the input as just a slug
        slug = quizLink.trim();
      }
      
      if (!slug) {
        throw new Error("Invalid quiz link");
      }
      
      // Navigate to the quiz
      navigate(`/quiz/${slug}`);
    } catch (error) {
      toast({
        title: "Invalid quiz link",
        description: "Please check the link and try again",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4 font-poppins">Find a Quiz</h2>
            <p className="text-muted-foreground mb-6">
              Enter a quiz link shared by a friend to take their quiz and test how well you know them!
            </p>
            
            <form className="max-w-md mx-auto" onSubmit={handleSubmit}>
              <div className="mb-6">
                <Label htmlFor="quiz-link" className="block text-left text-sm font-medium mb-1">
                  Quiz Link
                </Label>
                <Input
                  type="text"
                  id="quiz-link"
                  className="input-field"
                  placeholder="Paste the quiz link here (e.g., qzonme.com/quiz/username-abc123)"
                  value={quizLink}
                  onChange={(e) => setQuizLink(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="btn-primary w-full"
              >
                Take This Quiz
              </Button>
              
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="btn-secondary w-full"
                  onClick={() => navigate("/")}
                >
                  Back to Home
                </Button>
              </div>
            </form>
          </div>
          
          {/* Ad Placeholder */}
          <AdPlaceholder />
        </CardContent>
      </Card>
    </Layout>
  );
};

export default FindQuiz;