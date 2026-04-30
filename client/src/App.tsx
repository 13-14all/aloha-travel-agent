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
import AdminUsers from "./pages/AdminUsers";
import WelcomeTami from "./pages/WelcomeTami";
import WelcomeGuest from "./pages/WelcomeGuest";
import ChooseDisplayName from "./pages/ChooseDisplayName";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";

// ─── First-Login Flow Guard ───────────────────────────────────────────────────
// Step 1: If user hasn't chosen a display name → /choose-name
// Step 2: If user has a name but hasn't seen welcome → /welcome/tami or /welcome/guest
// This runs on every navigation so the user can't skip either step.
function WelcomeGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();

  // Pages that should never trigger a redirect
  const skipPages = [
    "/choose-name",
    "/welcome/tami",
    "/welcome/guest",
    "/help",
    "/admin/",
    "/join/",
  ];
  const shouldSkip = skipPages.some((p) => location.startsWith(p));

  useEffect(() => {
    if (loading || !isAuthenticated || shouldSkip) return;

    if (user) {
      // Step 1: Name not chosen yet → name picker
      if (!user.hasChosenName) {
        navigate("/choose-name");
        return;
      }
      // Step 2: Welcome not seen yet → welcome page
      if (!user.hasSeenWelcome) {
        const name = (user.displayName ?? user.name ?? "").toLowerCase();
        if (name.includes("tami") || name.includes("tamara")) {
          navigate("/welcome/tami");
        } else {
          navigate("/welcome/guest");
        }
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
        {/* Help page — opens in new window */}
        <Route path={"/help"} component={HowItWorks} />
        {/* Admin windows — open in new window */}
        <Route path={"/admin/feedback"} component={AdminFeedback} />
        <Route path={"/admin/users"} component={AdminUsers} />
        {/* First-login flow */}
        <Route path={"/choose-name"} component={ChooseDisplayName} />
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
