import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import JoinTrip from "./pages/JoinTrip";
import TripDashboard from "./pages/TripDashboard";
import HowItWorks from "./pages/HowItWorks";
import AdminFeedback from "./pages/AdminFeedback";
import WelcomeTami from "./pages/WelcomeTami";
import WelcomeGuest from "./pages/WelcomeGuest";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";

// ─── First-Login Redirect Guard ───────────────────────────────────────────────
// Checks if the authenticated user has seen their welcome page.
// If not, redirects them to the appropriate welcome page based on their name.
// Tami gets a personalized page; everyone else gets the general guest welcome.
function WelcomeGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();

  // Pages that should NOT trigger the welcome redirect
  const skipPages = ["/welcome/tami", "/welcome/guest", "/help", "/admin/feedback", "/join/"];
  const shouldSkip = skipPages.some((p) => location.startsWith(p));

  useEffect(() => {
    if (loading || !isAuthenticated || shouldSkip) return;
    if (user && !user.hasSeenWelcome) {
      // Detect Tami by name (case-insensitive)
      const name = (user.name ?? "").toLowerCase();
      if (name.includes("tami") || name.includes("tamara")) {
        navigate("/welcome/tami");
      } else {
        navigate("/welcome/guest");
      }
    }
  }, [user, isAuthenticated, loading, shouldSkip, navigate]);

  return <>{children}</>;
}

function Router() {
  return (
    <WelcomeGuard>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/trip/:id"} component={TripDashboard} />
        <Route path={"/join/:token"} component={JoinTrip} />
        {/* Help page — opens in new window, also accessible directly */}
        <Route path={"/help"} component={HowItWorks} />
        {/* Admin change request window */}
        <Route path={"/admin/feedback"} component={AdminFeedback} />
        {/* First-login welcome pages */}
        <Route path={"/welcome/tami"} component={WelcomeTami} />
        <Route path={"/welcome/guest"} component={WelcomeGuest} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WelcomeGuard>
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
