import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/common/Layout";

const TestQuizLookup: React.FC = () => {
  const [slug, setSlug] = useState("testuser-test123");
  const [, navigate] = useLocation();
  
  const handleGo = () => {
    navigate(`/quiz/${slug}`);
  };
  
  const currentUrl = window.location.origin;
  
  return (
    <Layout>
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-4 font-poppins">Test Quiz URL Navigation</h2>
          <p className="mb-4">Current domain: {currentUrl}</p>
          
          <div className="mb-4">
            <Input 
              type="text" 
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Enter quiz slug"
              className="mb-2"
            />
            <Button onClick={handleGo} className="w-full">
              Go to Quiz
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Direct URL: {currentUrl}/quiz/{slug}</p>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default TestQuizLookup;