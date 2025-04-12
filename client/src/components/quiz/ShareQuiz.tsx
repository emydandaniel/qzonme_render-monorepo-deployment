import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Twitter, Facebook, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "../common/Layout";

interface ShareQuizProps {
  accessCode: string;
  quizId: number;
}

const ShareQuiz: React.FC<ShareQuizProps> = ({ accessCode, quizId }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const quizLink = `${window.location.origin}/quiz/${accessCode}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(quizLink);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Quiz link copied to clipboard"
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleViewDashboard = () => {
    navigate(`/dashboard/${quizId}`);
  };
  
  const handleShare = (platform: string) => {
    let shareUrl = "";
    const shareText = "Test how well you know me by taking my QzonMe quiz!";
    
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(quizLink)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(quizLink)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent("Take my QzonMe quiz!")}&body=${encodeURIComponent(`${shareText} ${quizLink}`)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank");
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
          
          <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-6">
            <input 
              type="text" 
              value={quizLink} 
              className="bg-transparent flex-1 border-none focus:outline-none text-sm"
              readOnly
            />
            <Button variant="ghost" className="ml-2 text-primary" onClick={handleCopyLink}>
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
          
          <div className="flex space-x-3 justify-center mb-6">
            <Button 
              type="button" 
              className="btn-secondary flex items-center" 
              onClick={() => handleShare("twitter")}
            >
              <Twitter className="h-5 w-5 mr-1" />
              Twitter
            </Button>
            <Button 
              type="button" 
              className="btn-secondary flex items-center" 
              onClick={() => handleShare("facebook")}
            >
              <Facebook className="h-5 w-5 mr-1" />
              Facebook
            </Button>
            <Button 
              type="button" 
              className="btn-secondary flex items-center" 
              onClick={() => handleShare("email")}
            >
              <Mail className="h-5 w-5 mr-1" />
              Email
            </Button>
          </div>
          
          <div className="mt-6">
            <Button 
              type="button" 
              className="btn-primary" 
              onClick={handleViewDashboard}
            >
              View My Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ShareQuiz;
