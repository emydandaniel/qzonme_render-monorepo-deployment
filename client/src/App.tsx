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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateQuiz} />
      <Route path="/find-quiz" component={FindQuiz} />
      <Route path="/quiz/code/:accessCode">
        {(params) => <AnswerQuiz params={params} />}
      </Route>
      <Route path="/quiz/:creatorSlug">
        {(params) => <AnswerQuiz params={params} />}
      </Route>
      <Route path="/results/:quizId/:attemptId" component={Results} />
      <Route path="/dashboard/:quizId" component={Dashboard} />
      <Route path="/share/:quizId" component={ShareQuizPage} />
      <Route path="/test-quiz-lookup" component={TestQuizLookup} />
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
