import React from "react";
import StaticPageLayout from "@/components/common/StaticPageLayout";

const About: React.FC = () => {
  return (
    <StaticPageLayout 
      title="About QzonMe"
      description="Learn more about QzonMe - the ultimate quiz creation platform where you can build any type of quiz in minutes, from friendship tests to trivia challenges."
    >
      <h2 className="text-xl font-semibold mb-4">What is QzonMe?</h2>

      <p className="mb-4">
        QzonMe is the ultimate quiz creation platform where you can build any type of quiz in minutes! 
        From friendship tests to trivia challenges, classroom games to fandom quizzes - create manually or let our AI do the work for you.
      </p>

      <div className="p-4 bg-primary/10 rounded-md my-6 text-center">
        <p className="font-medium mb-2">Built for everyone - students, teachers, friends, and quiz enthusiasts</p>
        <p>Have fun creating and sharing quizzes on any topic you love!</p>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-2">Two Ways to Create</h3>
      <div className="mb-6">
        <h4 className="font-medium mb-2">📝 Manual Creation</h4>
        <ol className="list-decimal pl-6 mb-4 space-y-1">
          <li>Create your personalized quiz with questions on any topic</li>
          <li>Add images to make your quiz more engaging</li>
          <li>Share your unique quiz link anywhere</li>
          <li>Track scores and see who wins on the leaderboard!</li>
        </ol>
        
        <h4 className="font-medium mb-2">✨ AI Auto Creation</h4>
        <ol className="list-decimal pl-6 mb-4 space-y-1">
          <li>Tell our AI what quiz you want (e.g., "football trivia", "movie quiz")</li>
          <li>AI generates engaging questions automatically</li>
          <li>Review and edit questions if needed</li>
          <li>Share your AI-powered quiz instantly!</li>
        </ol>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-2">Perfect For</h3>
      <ul className="list-disc pl-6 mb-4 space-y-1">
        <li><strong>Personal Quizzes:</strong> "How well do you know me?" friendship tests</li>
        <li><strong>Educational Content:</strong> Classroom review games and study materials</li>
        <li><strong>Trivia Challenges:</strong> Sports, movies, music, anime, or any topic</li>
        <li><strong>Group Activities:</strong> Family games and team-building exercises</li>
        <li><strong>Fandom Fun:</strong> Test knowledge about favorite shows, books, or celebrities</li>
      </ul>
    </StaticPageLayout>
  );
};

export default About;