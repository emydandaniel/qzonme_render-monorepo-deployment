import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, BarChart, AlertTriangle, Clock, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "../common/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface ShareQuizProps {
  accessCode: string;
  quizId: number;
  urlSlug: string;
}

const ShareQuiz: React.FC<ShareQuizProps> = ({ accessCode, quizId, urlSlug }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedDashboard, setCopiedDashboard] = useState(false);
  
  // Fetch quiz data to get the dashboard token
  const { data: quiz, isLoading } = useQuery<any>({
    queryKey: [`/api/quizzes/${quizId}`],
    // Disable caching to ensure we always get fresh data
    staleTime: 0,
    refetchOnMount: true
  });
  
  // Use the custom domain for sharing as requested
  const customDomain = "https://qzonme.com";
  const quizLink = `${customDomain}/quiz/${urlSlug}`;
  const shareMessage = `Hey! I made this QzonMe quiz just for YOU. 👀\nLet's see if you really know me 👇\n${quizLink}`;
  
  // Format expiration date (30 days from today)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  const formattedExpirationDate = expirationDate.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  
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
  
  const handleCopyDashboardLink = () => {
    if (!quiz?.dashboardToken) return;
    
    const dashboardLink = `${customDomain}/dashboard/${quiz.dashboardToken}`;
    navigator.clipboard.writeText(dashboardLink);
    setCopiedDashboard(true);
    toast({
      title: "Dashboard link copied!",
      description: "Make sure to bookmark this link to access your results",
      duration: 3000
    });
    setTimeout(() => setCopiedDashboard(false), 3000);
  };
  
  const handleViewDashboard = () => {
    // Navigate to the dashboard with the dashboard token
    if (quiz?.dashboardToken) {
      navigate(`/dashboard/${quiz.dashboardToken}`);
    }
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
              🕒 <strong>Note:</strong> This quiz and its dashboard will remain active for 30 days from today (until {formattedExpirationDate}).
              After that, the links will expire and no longer be accessible.
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
          
          {/* Dashboard Link Box */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 mb-6">
            <h3 className="font-poppins font-semibold text-lg mb-2 text-left flex items-center">
              <Bookmark className="h-4 w-4 mr-2 text-primary" /> Your Dashboard Link
            </h3>
            <p className="text-sm text-gray-600 mb-3 text-left">
              <strong>Important:</strong> This is your unique dashboard link. Please bookmark or save it as it won't be stored in your browser.
            </p>
            
            {!isLoading && quiz?.dashboardToken ? (
              <div className="flex space-x-2 mb-3">
                <Input 
                  value={`${customDomain}/dashboard/${quiz.dashboardToken}`}
                  readOnly
                  className="bg-white"
                />
                <Button
                  type="button"
                  onClick={handleCopyDashboardLink}
                  disabled={copiedDashboard}
                >
                  {copiedDashboard ? "Copied!" : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="bg-white p-3 rounded border border-gray-200 text-sm mb-3 text-center">
                Loading dashboard link...
              </div>
            )}
            
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleViewDashboard}
              disabled={isLoading || !quiz?.dashboardToken}
            >
              <BarChart className="h-4 w-4 mr-2" /> View My Dashboard
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            <Clock className="h-3 w-3 inline-block mr-1" /> 
            Remember: You can only access your dashboard using the link above.
          </p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ShareQuiz;
