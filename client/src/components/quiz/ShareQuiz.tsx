import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, BarChart, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "../common/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ShareQuizProps {
  accessCode: string;
  quizId: number;
  urlSlug: string;
}

// Structure for saved quiz in localStorage
interface SavedQuiz {
  id: number;
  urlSlug: string;
  creatorName: string;
  expiresAt: string; // ISO date string
}

const ShareQuiz: React.FC<ShareQuizProps> = ({ accessCode, quizId, urlSlug }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Use the custom domain for sharing as requested
  const customDomain = "https://qzonme.com";
  const quizLink = `${customDomain}/quiz/${urlSlug}`;
  const shareMessage = `Hey! I made this QzonMe quiz just for YOU. 👀\nLet's see if you really know me 👇\n${quizLink}`;
  
  // Save quiz to localStorage when component mounts
  useEffect(() => {
    // Get creator name from quiz URL slug (best effort)
    const creatorName = urlSlug.split('-')[0]?.charAt(0).toUpperCase() + urlSlug.split('-')[0]?.slice(1) || 'Your';
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create quiz object to save
    const quizToSave: SavedQuiz = {
      id: quizId,
      urlSlug,
      creatorName,
      expiresAt: expiresAt.toISOString()
    };
    
    // Get existing quizzes or initialize empty array
    const savedQuizzes: SavedQuiz[] = JSON.parse(localStorage.getItem('myQuizzes') || '[]');
    
    // Check if quiz already exists
    const existingQuizIndex = savedQuizzes.findIndex(q => q.id === quizId);
    
    if (existingQuizIndex >= 0) {
      // Update existing quiz
      savedQuizzes[existingQuizIndex] = quizToSave;
    } else {
      // Add new quiz
      savedQuizzes.push(quizToSave);
    }
    
    // Save back to localStorage
    localStorage.setItem('myQuizzes', JSON.stringify(savedQuizzes));
    console.log('Saved quiz to localStorage:', quizToSave);
  }, [quizId, urlSlug]);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Now paste it to your friend 👌🏽",
      duration: 3000
    });
    setTimeout(() => setCopied(false), 3000);
  };
  
  const handleViewDashboard = () => {
    // Navigate to the dashboard with the quiz ID
    navigate(`/dashboard/${quizId}`);
  };
  
  return (
    <Layout>
      <Card className="text-center">
        <CardContent className="pt-6">
          <div className="mx-auto mb-6 w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4 font-poppins">Your Quiz is Ready!</h2>
          <p className="text-muted-foreground mb-6">
            Share this link with your friends to see how well they know you.
          </p>
          
          {/* Expiration Alert */}
          <Alert variant="destructive" className="mb-6 border-amber-500 bg-amber-50 text-amber-700">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Your quiz will expire in 30 days</AlertTitle>
            <AlertDescription>
              After 30 days, this quiz will no longer be accessible. 
              Make sure to share it with your friends soon!
            </AlertDescription>
          </Alert>
          
          {/* Share Box - Same style as in Results page */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 mb-6">
            <h3 className="font-poppins font-semibold text-lg mb-2 text-left">Share This Quiz</h3>
            <p className="text-sm text-gray-600 mb-3 text-left">
              Copy this message to invite your friends to take your quiz!
            </p>
            <div className="bg-white p-3 rounded border border-gray-200 text-sm mb-3 text-left">
              Hey! I made this QzonMe quiz just for YOU. 👀<br/>
              Let's see if you really know me 👇<br/>
              <span className="text-blue-500 truncate block">{quizLink}</span>
            </div>
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleCopyLink}
              disabled={copied}
            >
              {copied ? "Copied!" : (
                <>
                  <Copy className="h-4 w-4 mr-2" /> Copy Message
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-6">
            <Button 
              type="button" 
              className="btn-primary" 
              onClick={handleViewDashboard}
            >
              <BarChart className="h-4 w-4 mr-2" /> View My Dashboard
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            <Clock className="h-3 w-3 inline-block mr-1" /> 
            Remember: You can always access your dashboard from the home page later.
          </p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ShareQuiz;
