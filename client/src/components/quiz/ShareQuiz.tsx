import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, BarChart, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import Layout from "../common/Layout";

interface ShareQuizProps {
  accessCode: string;
  quizId: number;
  urlSlug: string;
}

const ShareQuiz: React.FC<ShareQuizProps> = ({ accessCode, quizId, urlSlug }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Use the custom domain for sharing as requested
  const customDomain = "https://qzonme.com";
  const quizLink = `${customDomain}/quiz/${urlSlug}`;
  const shareMessage = `Hey! I made this QzonMe quiz just for YOU. 👀\nLet's see if you really know me 👇\n${quizLink}`;
  
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
  
  // Removed social sharing functions as requested
  
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
          
          {/* Expiration Notice */}
          <Alert className="mb-6 bg-amber-50 text-amber-800 border-amber-200">
            <Clock className="h-4 w-4 text-amber-600 mr-2" />
            <AlertTitle>30-Day Expiration Notice</AlertTitle>
            <AlertDescription>
              Your quiz will automatically expire after 30 days. After expiration, the quiz and all responses will be permanently deleted.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            <Button 
              type="button" 
              className="btn-primary" 
              onClick={handleViewDashboard}
            >
              <BarChart className="h-4 w-4 mr-2" /> View My Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ShareQuiz;
