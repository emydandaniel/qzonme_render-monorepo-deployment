import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/common/Layout";

const FindQuiz: React.FC = () => {
  const [quizLink, setQuizLink] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleFindQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quizLink.trim()) {
      toast({
        title: "Link is required",
        description: "Please enter a quiz link or slug",
        variant: "destructive",
      });
      return;
    }
    
    // Extract slug if it's a full URL
    if (quizLink.includes("/quiz/")) {
      const urlParts = quizLink.split("/quiz/");
      const slug = urlParts[urlParts.length - 1].trim();
      navigate(`/quiz/${slug}`);
    }
    // Check if it's a direct access code (legacy)
    else if (quizLink.length === 6 && /^[A-Z0-9]{6}$/.test(quizLink)) {
      navigate(`/quiz/code/${quizLink}`);
    }
    // Otherwise treat as a slug
    else {
      navigate(`/quiz/${quizLink.trim()}`);
    }
  };

  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4 font-poppins">Find a Quiz</h2>
            <p className="text-muted-foreground mb-6">
              Enter a quiz link or slug to take your friend's quiz.
            </p>
            
            <form onSubmit={handleFindQuiz} className="max-w-md mx-auto">
              <div className="mb-4">
                <Label htmlFor="quiz-link" className="block text-left text-sm font-medium mb-1">
                  Quiz Link or Slug
                </Label>
                <Input
                  type="text"
                  id="quiz-link"
                  className="input-field"
                  placeholder="Paste link or enter quiz code"
                  value={quizLink}
                  onChange={(e) => setQuizLink(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="btn-primary w-full mt-4"
              >
                Find Quiz
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default FindQuiz;