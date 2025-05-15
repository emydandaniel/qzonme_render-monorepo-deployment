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
                    
                    <Link href={`/blog/${post.id}`}>
                      <Button variant="outline" className="mt-2">
                        Read More <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Sample blog post page */}
        <Card className="mt-12">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">10 Fun Question Ideas for Your Friendship Quiz</h2>
            <div className="flex flex-wrap gap-3 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                QzonMe Team
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                May 10, 2025
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                4 min read
              </div>
            </div>
            
            <div className="prose max-w-none">
              <p>
                Creating a memorable friendship quiz is all about asking the right questions. 
                Here's a list of creative question ideas to include in your next QzonMe quiz:
              </p>
              
              <h3>Personal Preferences</h3>
              <ol>
                <li><strong>What's my go-to comfort food when I'm feeling down?</strong> Options can include your favorite foods or snacks.</li>
                <li><strong>Which movie genre do I absolutely refuse to watch?</strong> Test if your friends know your movie preferences.</li>
                <li><strong>If I could only listen to one music artist for the rest of my life, who would it be?</strong> Include your favorite artist and some close seconds.</li>
              </ol>
              
              <h3>Childhood Memories</h3>
              <ul>
                <li><strong>What was my childhood dream job?</strong> Include what you wanted to be as a kid.</li>
                <li><strong>What was the name of my first pet?</strong> This tests how much your friends know about your childhood memories.</li>
              </ul>
              
              <h3>Habits & Quirks</h3>
              <ul>
                <li><strong>What's my most annoying habit?</strong> Be honest and include things you know you do that might annoy others.</li>
                <li><strong>How do I typically react when I'm stressed?</strong> Do you prefer to be alone, talk it out, or distract yourself?</li>
              </ul>
              
              <h3>Hypothetical Scenarios</h3>
              <ul>
                <li><strong>If I won the lottery, what's the first thing I would buy?</strong> Include realistic options based on your personality.</li>
                <li><strong>Which superpower would I choose if I could have any?</strong> This reveals a lot about your personality.</li>
                <li><strong>If I could travel anywhere in the world, where would I go first?</strong> Include your dream destinations.</li>
              </ul>
              
              <p>
                Remember to make your questions personal and specific to you. The more unique 
                and detailed your questions are, the better they'll test how well your friends 
                truly know you!
              </p>
              
              <p>
                Ready to create your own friendship quiz? Head back to our 
                <Link href="/">
                  <a className="text-primary"> home page </a>
                </Link>
                and get started right away. It only takes a few minutes to create a quiz 
                your friends will love!
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t">
            <Link href="/blog">
              <Button variant="outline">
                Back to All Posts
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default Blog;