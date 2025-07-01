import React from "react";
import HomePage from "@/components/home/HomePage";
import MetaTags from "@/components/common/MetaTags";

const Home: React.FC = () => {
  return (
    <>
      <MetaTags 
        title="QzonMe - Create Fun Quizzes for Everyone" 
        description="Create any kind of quiz instantly! From friendship tests to trivia challenges, classroom games to fandom quizzes. Share with friends and see who scores highest!"
        type="website"
      />
      <HomePage />
    </>
  );
};

export default Home;
