import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, BarChart } from "lucide-react";
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
  
  // Toggle between local and production URLs based on environment
  // For local testing, use relative URL that works on localhost
  const isLocalDev = window.location.hostname === 'localhost';
  const customDomain = isLocalDev ? window.location.origin : "https://qzonme.com";
  const quizLink = `${customDomain}/quiz/${urlSlug}`;
  const shareMessage = `Hey! I made this QzonMe quiz just for YOU. 👀\nLet's see if you really know me 👇\n${quizLink}`;
  
  // Also provide access code for alternative sharing
  const accessCodeMessage = `Access code: ${accessCode}`;
  
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
              className="w-full mb-4" 
              onClick={handleCopyLink}
              disabled={copied}
            >
              {copied ? "Copied!" : (
                <>
                  <Copy className="h-4 w-4 mr-2" /> Copy Message
                </>
              )}
            </Button>
            
            {/* Access code section */}
            <div className="mt-4 p-2 bg-gray-100 rounded border border-gray-200">
              <p className="text-sm text-gray-700 mb-1 text-left">Alternative sharing:</p>
              <div className="flex items-center justify-between bg-white p-2 rounded">
                <code className="text-sm font-mono text-gray-800">{accessCode}</code>
                <span className="text-xs text-gray-500">Access Code</span>
              </div>
            </div>
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
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ShareQuiz;
