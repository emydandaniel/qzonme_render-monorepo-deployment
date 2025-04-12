import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CreateQuiz from "@/pages/CreateQuiz";
import AnswerQuiz from "@/pages/AnswerQuiz";
import Results from "@/pages/Results";
import Dashboard from "@/pages/Dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateQuiz} />
      <Route path="/quiz/:accessCode" component={AnswerQuiz} />
      <Route path="/results/:quizId/:attemptId" component={Results} />
      <Route path="/dashboard/:quizId" component={Dashboard} />
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
