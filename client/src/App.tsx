import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CreateQuiz from "@/pages/CreateQuiz";
import AnswerQuiz from "@/pages/AnswerQuiz";
import Results from "@/pages/Results";
import Dashboard from "@/pages/Dashboard";
import FindQuiz from "@/pages/FindQuiz";
import ShareQuizPage from "@/pages/ShareQuizPage";
import TestQuizLookup from "@/pages/TestQuizLookup";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Blog from "@/pages/Blog";
import FAQ from "@/pages/FAQ";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateQuiz} />
      <Route path="/find-quiz" component={FindQuiz} />
      <Route path="/quiz/code/:accessCode" component={AnswerQuiz} />
      <Route path="/quiz/:creatorSlug" component={AnswerQuiz} />
      <Route path="/results/:quizId/:attemptId" component={Results} />
      <Route path="/dashboard/:token" component={Dashboard} />
      <Route path="/share/:quizId" component={ShareQuizPage} />
      <Route path="/test-quiz-lookup" component={TestQuizLookup} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/faq" component={FAQ} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
