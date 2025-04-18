import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Layout from "@/components/common/Layout";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy: React.FC = () => {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center text-primary" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Button>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <h1 className="text-2xl font-bold mb-4">Privacy Policy for QzonMe</h1>
            
            <p>
              At QzonMe, accessible from <a href="https://qzonme.com" className="text-primary">https://qzonme.com</a>, 
              your privacy is important to us. This Privacy Policy document outlines the types of information that is collected 
              and recorded by QzonMe and how we use it.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
            <p>
              We collect only necessary data, such as names entered for quizzes, quiz answers, and browser cookies to improve your experience.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
            <p>We use your data to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Display your quiz results and rankings</li>
              <li>Improve user experience</li>
              <li>Analyze how the website is used</li>
              <li>Serve relevant ads</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Third-Party Services</h2>
            <p>
              We use third-party advertising partners such as Ezoic, which may collect cookies and usage data.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Data Protection</h2>
            <p>
              We do not sell, trade, or transfer your data to outside parties.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Consent</h2>
            <p>
              By using our website, you consent to our Privacy Policy.
            </p>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={() => navigate("/")}
              className="w-full sm:w-auto"
            >
              Return to QzonMe
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default PrivacyPolicy;