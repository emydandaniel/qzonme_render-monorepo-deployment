import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Layout from "@/components/common/Layout";
import { ArrowLeft } from "lucide-react";

const TermsConditions: React.FC = () => {
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
            <h1 className="text-2xl font-bold mb-4">Terms & Conditions for QzonMe</h1>
            
            <p>
              By using this website, you agree to the following terms:
            </p>
            
            <ol className="list-decimal pl-6 mb-4 space-y-2">
              <li>You must be 13 years or older to use this site.</li>
              <li>You are responsible for the content you create or answer.</li>
              <li>The website may use ads to monetize content.</li>
              <li>We are not liable for any user-generated content.</li>
              <li>We reserve the right to ban misuse or spam.</li>
            </ol>
            
            <p className="mt-4">
              Use this site for fun, share your quiz responsibly, and stay respectful.
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

export default TermsConditions;