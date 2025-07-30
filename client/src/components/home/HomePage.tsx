import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdPlaceholder from "@/components/common/AdPlaceholder";
import Layout from "@/components/common/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, Users, MessageSquare, Heart, ThumbsUp, Share2, Trophy, Sparkles, FileQuestion } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Check if there's a pending quiz to answer
  const [pendingQuiz, setPendingQuiz] = useState<{
    type: 'code' | 'slug';
    value: string;
  } | null>(null);
  
  // Only check for pending quiz in session storage
  useEffect(() => {
    // Check if there's a pending quiz code or slug in session storage
    const pendingQuizCode = sessionStorage.getItem("pendingQuizCode");
    const pendingQuizSlug = sessionStorage.getItem("pendingQuizSlug");
    
    if (pendingQuizCode) {
      setPendingQuiz({ type: 'code', value: pendingQuizCode });
      sessionStorage.removeItem("pendingQuizCode");
    } else if (pendingQuizSlug) {
      setPendingQuiz({ type: 'slug', value: pendingQuizSlug });
      sessionStorage.removeItem("pendingQuizSlug");
    }
  }, []);

  const createUserMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/users", { username: name });
      return response.json();
    },
  });

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First scroll to the top of the page
    window.scrollTo(0, 0);
    
    if (!userName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      // Focus on the user name input at the top
      document.getElementById('user-name')?.focus();
      return;
    }
    
    try {
      const user = await createUserMutation.mutateAsync(userName);
      // Store user in session - ensure both variations are set to prevent issues
      sessionStorage.setItem("username", userName); 
      sessionStorage.setItem("userName", userName); // Set both versions for compatibility
      sessionStorage.setItem("userId", user.id);
      
      // Clear any local storage that might be interfering
      localStorage.removeItem("creatorName");
      
      // Clear auto-create flags to ensure clean manual quiz creation
      sessionStorage.removeItem("autoCreateMode");
      sessionStorage.removeItem("requiresReview");
      sessionStorage.removeItem("generatedQuestions");
      sessionStorage.removeItem("generationMetadata");
      
      // Clear any old draft questions and their metadata to prevent contamination
      localStorage.removeItem("qzonme_draft_questions");
      localStorage.removeItem("qzonme_draft_metadata");
      
      // Navigate to quiz creation
      navigate("/create");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAutoCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First scroll to the top of the page
    window.scrollTo(0, 0);
    
    if (!userName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      // Focus on the user name input at the top
      document.getElementById('user-name')?.focus();
      return;
    }
    
    try {
      const user = await createUserMutation.mutateAsync(userName);
      // Store user in session - ensure both variations are set to prevent issues
      sessionStorage.setItem("username", userName); 
      sessionStorage.setItem("userName", userName); // Set both versions for compatibility
      sessionStorage.setItem("userId", user.id);
      
      // Clear any local storage that might be interfering
      localStorage.removeItem("creatorName");
      
      // Navigate to auto-create quiz page
      navigate("/auto-create");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAnswerQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const user = await createUserMutation.mutateAsync(userName);
      // Store user in session - ensure both variations are set to prevent issues
      sessionStorage.setItem("username", userName); 
      sessionStorage.setItem("userName", userName); // Set both versions for compatibility
      sessionStorage.setItem("userId", user.id);
      
      // Clear any local storage that might be interfering
      localStorage.removeItem("creatorName");
      
      // If there's a pending quiz, navigate to it
      if (pendingQuiz) {
        if (pendingQuiz.type === 'code') {
          navigate(`/quiz/code/${pendingQuiz.value}`);
        } else {
          navigate(`/quiz/${pendingQuiz.value}`);
        }
        return;
      }
      
      // Otherwise, try to get quiz URL from clipboard
      navigator.clipboard.readText()
        .then(clipText => {
          // Check if clipboard contains a quiz URL or slug
          if (clipText.includes("/quiz/") || !clipText.includes("/")) {
            let slug = clipText;
            
            // Extract slug if it's a full URL
            if (clipText.includes("/quiz/")) {
              const urlParts = clipText.split("/quiz/");
              slug = urlParts[urlParts.length - 1].trim();
            }
            
            // Navigate to the quiz
            navigate(`/quiz/${slug}`);
          } else {
            // If clipboard doesn't contain a valid quiz link, go to find-quiz page
            navigate("/find-quiz");
          }
        })
        .catch(() => {
          // If can't access clipboard, go to find-quiz page
          navigate("/find-quiz");
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Features for homepage
  const features = [
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Any Quiz Type",
      description: "Friendship tests, trivia challenges, classroom games, fandom quizzes, or any topic you love!"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: "AI-Powered Creation",
      description: "Let our smart AI generate quiz questions automatically, or create them manually - your choice!"
    },
    {
      icon: <Share2 className="h-8 w-8 text-primary" />,
      title: "Easy Sharing",
      description: "Share your quiz link on WhatsApp, Instagram, or any social platform in seconds."
    },
    {
      icon: <Trophy className="h-8 w-8 text-primary" />,
      title: "Competitive Leaderboard",
      description: "See who scored highest on your quiz with our real-time leaderboard and rankings."
    },
    {
      icon: <Heart className="h-8 w-8 text-primary" />,
      title: "Quick & Free",
      description: "No sign-up required - create and share any quiz instantly at no cost."
    },
    {
      icon: <FileQuestion className="h-8 w-8 text-primary" />,
      title: "Perfect for Education",
      description: "Teachers love using QzonMe for classroom review games, study sessions, and engaging students with interactive learning."
    }
  ];

  // Testimonials for homepage
  const testimonials = [
    {
      name: "Emma R. (Teacher)",
      content: "Perfect for my classroom! I create review quizzes for my students before exams. The AI feature saves me hours - I just upload my lesson notes and get instant quiz questions!"
    },
    {
      name: "Jake M. (Content Creator)",
      content: "My followers love the 'How well do you know me?' quizzes I make! Great way to engage my audience and the leaderboard makes it super competitive. Got 500+ responses in one day!"
    },
    {
      name: "Sarah K. (Student)",
      content: "I make study quizzes for my friend group before finals. We test each other on everything from biology to history. Makes studying way more fun and interactive!"
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="mb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 font-poppins">Create Any Quiz in Minutes!</h1>
              
              {/* Different description based on whether we are on the main domain or a shared link */}
              {pendingQuiz ? (
                <p className="text-muted-foreground mb-6">
                  Before you answer this quiz, we need to know who you are! Enter your name below to continue.
                </p>
              ) : (
                <p className="text-lg text-muted-foreground mb-6">
                  From friendship tests to trivia challenges, classroom games to fandom quizzes - 
                  create, share, and compete with friends! It's free, fun, and takes just minutes!
                </p>
              )}
              
              {/* Name Input Form */}
              <form className="max-w-md mx-auto">
                <div className="mb-4">
                  <Label htmlFor="user-name" className="block text-left text-sm font-medium mb-1">
                    Your Name
                  </Label>
                  <Input
                    type="text"
                    id="user-name"
                    className="input-field"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  {/* Always show all three buttons, with Auto Create Quiz as the newest feature last */}
                  <Button 
                    type="button" 
                    className="btn-primary flex-1" 
                    onClick={handleCreateQuiz}
                    disabled={createUserMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create Quiz
                  </Button>
                  <Button 
                    type="button" 
                    className={pendingQuiz ? "btn-primary flex-1" : "btn-secondary flex-1"} 
                    onClick={handleAnswerQuiz}
                    disabled={createUserMutation.isPending}
                  >
                    {pendingQuiz ? (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" /> Answer This Quiz
                      </>
                    ) : (
                      <>
                        Answer Quiz
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    className="btn-secondary flex-1" 
                    onClick={handleAutoCreateQuiz}
                    disabled={createUserMutation.isPending}
                  >
                    <Sparkles className="h-4 w-4 mr-2" /> Auto Create
                  </Button>
                </div>
              </form>
            </div>
            
            {/* Ad Placement */}
            <AdPlaceholder />
          </CardContent>
        </Card>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Why People Love QzonMe</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="mb-2">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">How It Works</CardTitle>
            <CardDescription className="text-center">Create, share, and enjoy in 3 simple steps - manually or with AI assistance!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Manual Creation */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">📝 Manual Quiz Creation</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-medium">Create Your Quiz</h4>
                      <p className="text-muted-foreground text-sm">Enter your name and create questions on any topic! Add images to make it more engaging.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-medium">Share With Everyone</h4>
                      <p className="text-muted-foreground text-sm">Get a unique link to share on social media or send directly to friends and family.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-medium">See Who Wins</h4>
                      <p className="text-muted-foreground text-sm">Check out your leaderboard to see who scored highest on your quiz!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Auto Creation */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 text-center">✨ AI Auto Quiz Creation</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-medium">Choose Your Topic</h4>
                      <p className="text-muted-foreground text-sm">Tell our AI what quiz you want - from "football trivia" to "how well do you know me" - and watch the magic happen!</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-medium">AI Generates Questions</h4>
                      <p className="text-muted-foreground text-sm">Our smart AI creates engaging questions with multiple choice answers automatically - you can edit or approve them.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-medium">Share & Compete</h4>
                      <p className="text-muted-foreground text-sm">Your AI-generated quiz is ready to share! Track results on the leaderboard just like manual quizzes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button onClick={handleCreateQuiz}>
              <Plus className="h-4 w-4 mr-2" /> Create Manual Quiz
            </Button>
            <Button onClick={handleAutoCreateQuiz} variant="secondary">
              <Sparkles className="h-4 w-4 mr-2" /> Try AI Auto Create
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* Testimonials */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">What Users Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="h-full">
              <CardContent className="pt-6">
                <blockquote className="text-muted-foreground italic mb-4">"{testimonial.content}"</blockquote>
                <div className="flex items-center">
                  <ThumbsUp className="h-4 w-4 text-primary mr-2" />
                  <span className="font-medium">{testimonial.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="mb-8">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Create Your Quiz?</h2>
              <p className="mb-6">Choose manual creation for full control or let AI do the work - it's free, fun, and takes just minutes!</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="secondary" size="lg" onClick={handleCreateQuiz}>
                  <Plus className="h-4 w-4 mr-2" /> Create Manual Quiz
                </Button>
                <Button variant="outline" size="lg" onClick={handleAutoCreateQuiz} className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  <Sparkles className="h-4 w-4 mr-2" /> Try AI Auto Create
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* What is QzonMe section */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">What is QzonMe?</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p>
                QzonMe is the ultimate quiz creation platform where you can build any type of quiz in minutes! 
                From friendship tests to trivia challenges, classroom games to fandom quizzes - create manually or let our AI do the work for you!
              </p>
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Two Ways to Create:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Manual Creation:</strong> Build your quiz question by question with full control over content and images</li>
                  <li><strong>AI Auto Creation:</strong> Tell our AI your topic and let it generate engaging questions automatically (3 generations per day)</li>
                </ul>
              </div>
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Perfect for Any Quiz Type:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Personal Quizzes:</strong> "How well do you know me?" friendship tests</li>
                  <li><strong>Trivia Challenges:</strong> Football, music, movies, anime, or any topic</li>
                  <li><strong>Classroom Games:</strong> Fun revision quizzes and educational tests</li>
                  <li><strong>Group Activities:</strong> Family games and team-building exercises</li>
                  <li><strong>Fandom Fun:</strong> Test knowledge about favorite shows, books, or celebrities</li>
                </ul>
              </div>
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Why Choose QzonMe?</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No account or sign-up required - create any quiz instantly</li>
                  <li>AI-powered auto generation or full manual control - your choice</li>
                  <li>Beautiful, mobile-friendly interface that works on any device</li>
                  <li>Share your quiz anywhere with a custom link</li>
                  <li>Real-time leaderboard shows who's winning</li>
                  <li>Completely free to use with no hidden fees</li>
                </ul>
              </div>
              <p>
                Whether you're a teacher creating review games, a friend making trivia for your group, or someone testing family knowledge,
                QzonMe makes quiz creation fun, fast, and completely free - with or without AI assistance!
              </p>
              <div className="flex justify-center">
                <Link href="/faq">
                  <Button variant="outline">Learn More About QzonMe</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      
      {/* Blog preview section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Latest from Our Blog</h2>
          <Link href="/blog">
            <span className="text-primary hover:underline cursor-pointer">View all</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-2">10 Fun Quiz Ideas to Challenge Your Friends</h3>
              <p className="text-muted-foreground mb-4">Creating a quiz is half the fun, but getting started with good questions makes all the difference.</p>
              <Link href="/blog/quiz-ideas">
                <Button variant="outline">
                  Read More <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-2">Why QzonMe Is the Funniest Way to Bond</h3>
              <p className="text-muted-foreground mb-4">QzonMe isn't just another quiz platform. It's a space where humor, friendship, and personality collide.</p>
              <Link href="/blog/why-qzonme-is-the-funniest-way-to-bond">
                <Button variant="outline">
                  Read More <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
