import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Leaderboard from "@/components/common/Leaderboard";
import AdPlaceholder from "@/components/common/AdPlaceholder";
import Layout from "@/components/common/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get recent attempts for leaderboard preview
  const { data: recentAttempts = [] } = useQuery({
    queryKey: ["/api/quiz-attempts/recent"],
    enabled: false, // Disable for now - we'll fetch this in a real app
  });

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

  const handleFindQuiz = async (e: React.FormEvent) => {
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
      
      // Navigate to quiz finder page
      navigate("/find-quiz");
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
            <p className="text-muted-foreground mb-6">
              Create a quiz and find out how well your friends really know you, or test your knowledge about your friends!
            </p>
            
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
                <Button 
                  type="button" 
                  className="btn-primary flex-1" 
                  onClick={handleCreateQuiz}
                  disabled={createUserMutation.isPending}
                >
                  Create My Quiz
                </Button>
                <Button 
                  type="button" 
                  className="btn-secondary flex-1" 
                  onClick={handleFindQuiz}
                  disabled={createUserMutation.isPending}
                >
                  Find a Quiz
                </Button>
              </div>
            </form>
          </div>
          
          {/* Leaderboard Preview */}
          <div className="mt-8">
            <h3 className="font-poppins font-semibold text-lg mb-3">Top Scores</h3>
            <Leaderboard attempts={recentAttempts} />
          </div>
          
          {/* Ad Placeholder */}
          <AdPlaceholder />
        </CardContent>
      </Card>
    </Layout>
  );
};

export default HomePage;
