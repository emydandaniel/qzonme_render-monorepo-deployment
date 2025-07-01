import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BookOpen, Heart, Gamepad2, Trophy } from "lucide-react";
import Layout from "@/components/common/Layout";
import MetaTags from "@/components/common/MetaTags";

const QzonMeEvolution: React.FC = () => {
  return (
    <Layout>
      <MetaTags
        title="The Evolution of QzonMe: From Friendship Quizzes to Universal Quiz Platform"
        description="Discover how QzonMe evolved from a simple friendship quiz maker into the ultimate platform for creating any type of quiz - from trivia challenges to classroom games."
        type="article"
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/blog">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold mb-4">
              The Evolution of QzonMe: From Friendship Quizzes to Universal Quiz Platform
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              How we transformed QzonMe into the ultimate quiz creation platform for everyone
            </p>
          </CardHeader>
          
          <CardContent className="prose prose-lg max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center">
                  <Heart className="h-6 w-6 mr-2 text-primary" />
                  Where We Started
                </h2>
                <p>
                  QzonMe began with a simple but powerful idea: "How well do your friends really know you?" 
                  We created a platform where people could make personalized quizzes about themselves, 
                  share them with friends, and discover who truly understood them best.
                </p>
                <p>
                  The response was incredible! People loved creating these intimate, personal quizzes 
                  for birthdays, social media, and just for fun. But as our community grew, we noticed 
                  something amazing happening...
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center">
                  <Users className="h-6 w-6 mr-2 text-primary" />
                  What Our Users Taught Us
                </h2>
                <p>
                  Our users started getting creative in ways we never expected:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Teachers</strong> were creating fun review quizzes for their students</li>
                  <li><strong>Friends</strong> were making Harry Potter and anime trivia challenges</li>
                  <li><strong>Families</strong> were designing game night quizzes for reunions</li>
                  <li><strong>Content creators</strong> were engaging their audiences with custom quizzes</li>
                  <li><strong>Study groups</strong> were turning boring material into competitive games</li>
                </ul>
                <p>
                  It became clear that our simple, no-signup-required platform was perfect for 
                  <em>any</em> type of quiz, not just personal ones!
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center">
                  <Trophy className="h-6 w-6 mr-2 text-primary" />
                  The Big Evolution
                </h2>
                <p>
                  Today, we're excited to officially position QzonMe as the <strong>universal quiz creation platform</strong>. 
                  Our mission is simple: make it incredibly easy for anyone to create any type of quiz in minutes.
                </p>
                
                <div className="bg-muted p-6 rounded-lg my-6">
                  <h3 className="font-semibold mb-3">What You Can Create Now:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <Heart className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <strong>Personal Quizzes:</strong> Classic "How well do you know me?" tests
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <BookOpen className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <strong>Educational Games:</strong> Study aids and classroom review quizzes
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Gamepad2 className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <strong>Trivia Challenges:</strong> Sports, movies, music, anime - any topic!
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <strong>Group Activities:</strong> Family games, team building, icebreakers
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">
                  Why QzonMe is Perfect for Any Quiz
                </h2>
                <p>
                  While other quiz platforms are either too complicated or too limited, QzonMe hits the sweet spot:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>No account required</strong> - Start creating immediately</li>
                  <li><strong>Mobile-friendly</strong> - Works perfectly on phones, tablets, and computers</li>
                  <li><strong>Easy sharing</strong> - One link works everywhere</li>
                  <li><strong>Real-time leaderboard</strong> - See who's winning as they play</li>
                  <li><strong>Image support</strong> - Add photos to make quizzes more engaging</li>
                  <li><strong>Completely free</strong> - No hidden fees or premium features</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">
                  Real Success Stories
                </h2>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="italic">
                      "I created a Harry Potter trivia for my friend group and we got 50+ responses in just a few hours. 
                      Everyone was so competitive trying to get the top score!"
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">- Sarah K., College Student</p>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="italic">
                      "As a teacher, I love how easy it is to create review quizzes for my students. 
                      The leaderboard makes studying actually fun and competitive."
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">- James T., High School Teacher</p>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="italic">
                      "Perfect for our family reunion! I made a 'How well do you know our family?' quiz 
                      and it was the hit of the weekend."
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">- Mia L., Family Organizer</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">
                  What's Next?
                </h2>
                <p>
                  This evolution is just the beginning. We're constantly working to make QzonMe even better:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>More question types and formats</li>
                  <li>Enhanced customization options</li>
                  <li>Better analytics for creators</li>
                  <li>Team collaboration features</li>
                </ul>
                <p>
                  But our core mission remains the same: making quiz creation so simple and fun that 
                  anyone can do it, regardless of their technical skills or the type of quiz they want to make.
                </p>
              </section>

              <section className="bg-primary text-primary-foreground p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">Ready to Create Your Quiz?</h2>
                <p className="mb-4">
                  Whether you want to test your friends, engage your students, challenge your family, 
                  or create the ultimate fandom trivia - QzonMe makes it incredibly easy.
                </p>
                <Link href="/">
                  <Button variant="secondary" size="lg">
                    Create Your Quiz Now - It's Free!
                  </Button>
                </Link>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default QzonMeEvolution;