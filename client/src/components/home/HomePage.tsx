import React, { useState, useEffect } from "react";
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
import { BarChart, ArrowRight, Plus } from "lucide-react";

// Interface for saved quizzes in localStorage
interface SavedQuiz {
  id: number;
  urlSlug: string;
  creatorName: string;
  expiresAt: string; // ISO date string
}

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [myQuizzes, setMyQuizzes] = useState<SavedQuiz[]>([]);

  // Check if there's a pending quiz to answer
  const [pendingQuiz, setPendingQuiz] = useState<{
    type: 'code' | 'slug' | 'id';
    value: string;
  } | null>(null);
  
  // Load ONLY user's created quizzes from localStorage
  useEffect(() => {
    // Check if there is a user session first
    const sessionUserName = sessionStorage.getItem("userName");
    const sessionUserId = sessionStorage.getItem("userId");
    
    // Load the user's created quizzes (not other quizzes) from localStorage
    const savedQuizzes: SavedQuiz[] = JSON.parse(localStorage.getItem('myCreatedQuizzes') || '[]');
    
    // Only show created quizzes if there's an active user session
    if (!sessionUserName || !sessionUserId) {
      setMyQuizzes([]);
      return;
    }
    
    // Filter out expired quizzes (older than 30 days)
    const now = new Date();
    const validQuizzes = savedQuizzes.filter(quiz => {
      const expiryDate = new Date(quiz.expiresAt);
      return expiryDate > now;
    });
    
    // If we filtered out any expired quizzes, update localStorage
    if (validQuizzes.length !== savedQuizzes.length) {
      localStorage.setItem('myCreatedQuizzes', JSON.stringify(validQuizzes));
    }
    
    setMyQuizzes(validQuizzes);
    
    // Check if there's a pending quiz code, ID or slug in session storage
    const pendingQuizCode = sessionStorage.getItem("pendingQuizCode");
    const pendingQuizId = sessionStorage.getItem("pendingQuizId");
    const pendingQuizSlug = sessionStorage.getItem("pendingQuizSlug");
    
    if (pendingQuizCode) {
      setPendingQuiz({ type: 'code', value: pendingQuizCode });
      sessionStorage.removeItem("pendingQuizCode");
    } else if (pendingQuizId) {
      setPendingQuiz({ type: 'id', value: pendingQuizId });
      sessionStorage.removeItem("pendingQuizId");
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
        } else if (pendingQuiz.type === 'id') {
          navigate(`/quiz/id/${pendingQuiz.value}`);
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
  
  const handleViewMyQuiz = (quizId: number) => {
    navigate(`/dashboard/${quizId}`);
  };

  return (
    <Layout>
      {/* My Quizzes Card - Show if user has created quizzes */}
      {myQuizzes.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-4 font-poppins">My Quizzes</h3>
            <div className="space-y-3">
              {myQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{quiz.creatorName}'s Quiz</p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(quiz.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMyQuiz(quiz.id)}
                  >
                    <BarChart className="h-4 w-4 mr-2" /> View Dashboard
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Homepage Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4 font-poppins">Welcome to QzonMe</h2>
            
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
                {/* Always show both buttons, regardless of how the page was accessed */}
                <Button 
                  type="button" 
                  className="btn-primary flex-1" 
                  onClick={handleCreateQuiz}
                  disabled={createUserMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" /> Create a Quiz
                </Button>
                <Button 
                  type="button" 
                  className={pendingQuiz ? "btn-primary flex-1" : "btn-secondary flex-1"} 
                  onClick={handleAnswerQuiz}
                  disabled={createUserMutation.isPending}
                >
                  {pendingQuiz ? (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" /> Answer This Quiz
                    </>
                  ) : (
                    <>
                      Answer a Quiz
                    </>
                  )}
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

export default HomePage;
