import React from "react";
import { Link } from "wouter";
import Layout from "@/components/common/Layout";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import MetaTags from "@/components/common/MetaTags";

// Blog post data 
const blogPosts = [
  {
    id: "question-ideas",
    title: "10 Fun Question Ideas for Your Friendship Quiz",
    excerpt: "Looking for inspiration? Here are some creative questions to include in your next friendship quiz that will really test how well your friends know you.",
    author: "QzonMe Team",
    date: "May 10, 2025",
    readTime: "4 min read",
    image: "/blog/question-ideas.jpg"
  },
  {
    id: "friendship-facts",
    title: "Surprising Facts About Friendship You Never Knew",
    excerpt: "Friendship is one of life's greatest joys, but there's more to it than you might think. Discover the science behind friendships and why they're so important.",
    author: "QzonMe Team",
    date: "May 5, 2025",
    readTime: "5 min read",
    image: "/blog/friendship-facts.jpg"
  },
  {
    id: "quiz-success",
    title: "How to Make Your Quiz Go Viral Among Friends",
    excerpt: "Want to get more friends to take your quiz? Learn the best strategies for sharing and promoting your personalized quiz to get maximum engagement.",
    author: "QzonMe Team",
    date: "April 28, 2025",
    readTime: "3 min read",
    image: "/blog/quiz-success.jpg"
  }
];

const Blog: React.FC = () => {
  return (
    <Layout>
      <MetaTags 
        title="Blog | QzonMe - How Well Do Your Friends Know You?" 
        description="Discover tips, tricks, and fun ideas for creating and sharing your QzonMe friendship quizzes. Read our latest articles about friendship, quizzes, and more."
      />
      
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">QzonMe Blog</h1>
          <p className="text-muted-foreground">
            Discover tips, tricks, and fun ideas for your friendship quizzes
          </p>
        </div>
        
        <div className="space-y-8">
          {blogPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-3 gap-0">
                  <div className="bg-muted h-48 md:h-full flex items-center justify-center">
                    <div className="text-2xl font-bold text-primary px-4 text-center">
                      {post.title}
                    </div>
                  </div>
                  <div className="md:col-span-2 p-6">
                    <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                    
                    <div className="flex flex-wrap gap-3 mb-3 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {post.author}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {post.date}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {post.readTime}
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      {post.excerpt}
                    </p>
                    
                    <Button variant="outline" className="mt-2" disabled>
                      Coming Soon <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Coming Soon Message */}
        <Card className="mt-12">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-4">More Articles Coming Soon!</h2>
            <p className="text-muted-foreground mb-6">
              We're working on creating more helpful content about friendship quizzes, social sharing tips, and how to create engaging questions.
              Check back soon for new articles!
            </p>
            <Link href="/">
              <Button variant="outline">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Blog;