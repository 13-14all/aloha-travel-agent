import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import JoinTrip from "./pages/JoinTrip";
import TripDashboard from "./pages/TripDashboard";
import HowItWorks from "./pages/HowItWorks";
import AdminFeedback from "./pages/AdminFeedback";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/trip/:id"} component={TripDashboard} />
      <Route path={"/join/:token"} component={JoinTrip} />
      {/* Help page — opens in new window, also accessible directly */}
      <Route path={"/help"} component={HowItWorks} />
      {/* Admin change request window */}
      <Route path={"/admin/feedback"} component={AdminFeedback} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
