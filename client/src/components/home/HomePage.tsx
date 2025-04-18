import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdPlaceholder from "@/components/common/AdPlaceholder";
import Layout from "@/components/common/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Removed leaderboard section as requested
  
  // Check if there's a pending quiz to answer
  const [pendingQuiz, setPendingQuiz] = React.useState<{
    type: 'code' | 'slug';
    value: string;
  } | null>(null);
  
  React.useEffect(() => {
    // Check if there's a pending quiz code or slug in session storage
    const pendingQuizCode = sessionStorage.getItem("pendingQuizCode");
    const pendingQuizSlug = sessionStorage.getItem("pendingQuizSlug");
    
    if (pendingQuizCode) {
      setPendingQuiz({ type: 'code', value: pendingQuizCode });
      sessionStorage.removeItem("pendingQuizCode");
    } else if (pendingQuizSlug) {
      setPendingQuiz({ type: 'slug', value: pendingQuizSlug });
      sessionStorage.removeItem("pendingQuizSlug");
    }
  }, []);

  const createUserMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/users", { username: name });
      return response.json();
    },
  });

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const user = await createUserMutation.mutateAsync(userName);
      // Store user in session
      sessionStorage.setItem("userName", userName);
      sessionStorage.setItem("userId", user.id);
      
      // Navigate to quiz creation
      navigate("/create");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAnswerQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const user = await createUserMutation.mutateAsync(userName);
      // Store user in session
      sessionStorage.setItem("userName", userName);
      sessionStorage.setItem("userId", user.id);
      
      // If there's a pending quiz, navigate to it
      if (pendingQuiz) {
        if (pendingQuiz.type === 'code') {
          navigate(`/quiz/code/${pendingQuiz.value}`);
        } else {
          navigate(`/quiz/${pendingQuiz.value}`);
        }
        return;
      }
      
      // Otherwise, try to get quiz URL from clipboard
      navigator.clipboard.readText()
        .then(clipText => {
          // Check if clipboard contains a quiz URL or slug
          if (clipText.includes("/quiz/") || !clipText.includes("/")) {
            let slug = clipText;
            
            // Extract slug if it's a full URL
            if (clipText.includes("/quiz/")) {
              const urlParts = clipText.split("/quiz/");
              slug = urlParts[urlParts.length - 1].trim();
            }
            
            // Navigate to the quiz
            navigate(`/quiz/${slug}`);
          } else {
            // If clipboard doesn't contain a valid quiz link, go to find-quiz page
            navigate("/find-quiz");
          }
        })
        .catch(() => {
          // If can't access clipboard, go to find-quiz page
          navigate("/find-quiz");
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4 font-poppins">Welcome to QzonMe</h2>
            
            {/* Impact.com verification code */}
            <p className="text-xs text-gray-400 mb-2">Impact-Site-Verification: b5fda72b-96df-433f-b071-569f9e25e6f2</p>
            
            {/* Different description based on whether we are on the main domain or a shared link */}
            {pendingQuiz ? (
              <p className="text-muted-foreground mb-6">
                Before you answer this quiz, we need to know who you are! Enter your name below to continue.
              </p>
            ) : (
              <p className="text-muted-foreground mb-6">
                QzonMe is a fun way to test how well your friends really know you. Built with love by students for good vibes & laughs 🧡
              </p>
            )}
            
            {/* Name Input Form */}
            <form className="max-w-md mx-auto">
              <div className="mb-4">
                <Label htmlFor="user-name" className="block text-left text-sm font-medium mb-1">
                  Your Name
                </Label>
                <Input
                  type="text"
                  id="user-name"
                  className="input-field"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
                {/* Show both buttons on main site, only Answer button on shared links */}
                {!pendingQuiz ? (
                  <>
                    <Button 
                      type="button" 
                      className="btn-primary flex-1" 
                      onClick={handleCreateQuiz}
                      disabled={createUserMutation.isPending}
                    >
                      Create a Quiz
                    </Button>
                    <Button 
                      type="button" 
                      className="btn-secondary flex-1" 
                      onClick={handleAnswerQuiz}
                      disabled={createUserMutation.isPending}
                    >
                      Answer a Quiz
                    </Button>
                  </>
                ) : (
                  <Button 
                    type="button" 
                    className="btn-primary w-full" 
                    onClick={handleAnswerQuiz}
                    disabled={createUserMutation.isPending}
                  >
                    Answer Quiz
                  </Button>
                )}
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

export default HomePage;
