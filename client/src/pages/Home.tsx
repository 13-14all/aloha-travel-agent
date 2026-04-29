import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, LogIn, LogOut, Loader2, Globe, Plane, Map, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { TripCard } from "@/components/TripCard";
import { Mascot } from "@/components/Mascot";
import { HelpButton } from "@/components/HelpButton";
import { toast } from "sonner";

const DESTINATION_TEMPLATES = [
  {
    key: "hawaii",
    name: "Hawaii",
    emoji: "🌺",
    description: "Oahu, Big Island, Maui & more",
    defaultTitle: "Hawaii Adventure",
    bgClass: "gradient-sunset",
  },
  {
    key: "scotland",
    name: "Scotland",
    emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    description: "Highlands, Edinburgh & Isles",
    defaultTitle: "Scottish Highlands Journey",
    bgClass: "gradient-tropical",
  },
  {
    key: "italy",
    name: "Italy",
    emoji: "🍕",
    description: "Rome, Tuscany, Amalfi & more",
    defaultTitle: "Italian Escape",
    bgClass: "gradient-ocean",
  },
  {
    key: "japan",
    name: "Japan",
    emoji: "🌸",
    description: "Tokyo, Kyoto, Osaka & beyond",
    defaultTitle: "Japan Discovery",
    bgClass: "gradient-tropical",
  },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [selectedDestKey, setSelectedDestKey] = useState("hawaii");
  const [tripTitle, setTripTitle] = useState("Hawaii Adventure");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: trips = [], isLoading: tripsLoading } = trpc.trips.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: (data) => {
      utils.trips.list.invalidate();
      setShowNewTrip(false);
      navigate(`/trip/${data.id}`);
      toast.success("Trip created! Let's start planning!");
    },
    onError: () => toast.error("Couldn't create trip. Please try again."),
  });

  const deleteTrip = trpc.trips.delete.useMutation({
    onSuccess: () => {
      utils.trips.list.invalidate();
      setShowDeleteConfirm(null);
      toast.success("Trip deleted");
    },
    onError: () => toast.error("Couldn't delete trip"),
  });

  const handleSelectDestination = (key: string, defaultTitle: string) => {
    setSelectedDestKey(key);
    setTripTitle(defaultTitle);
  };

  const handleCreateTrip = () => {
    if (!tripTitle.trim()) return;
    const dest = DESTINATION_TEMPLATES.find((d) => d.key === selectedDestKey);
    createTrip.mutate({
      title: tripTitle,
      destination: dest?.name || "Hawaii",
      destinationKey: selectedDestKey,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-tropical flex items-center justify-center text-xl shadow-md">
              🌺
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Aloha Travel
              </h1>
              <p className="text-xs text-muted-foreground leading-none">Your Personal AI Agent</p>
            </div>
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-2">
            {/* Help button — always visible */}
            <HelpButton />

            {/* Suggest a Change — visible to all logged-in users */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/admin/feedback", "aloha_feedback", "width=760,height=820,scrollbars=yes,resizable=yes,toolbar=no,menubar=no")}
                className="gap-2 h-10 text-base border-amber-300 text-amber-700 hover:bg-amber-50 hidden sm:flex"
                title="Suggest a change or report an issue"
              >
                🛠️ <span className="hidden md:inline">Suggest a Change</span>
              </Button>
            )}

            {/* Auth */}
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden lg:block">
                  Welcome, <strong className="text-foreground">{user.name || "Traveler"}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="text-sm h-10"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="gradient-tropical text-white border-0 shadow-md"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In to Start
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      {!user && (
        <section className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 gradient-tropical opacity-95" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Text */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 text-white rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
                  <Star className="w-4 h-4 fill-white" />
                  Your Personal AI Travel Agent
                </div>
                <h2
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Plan Your Perfect
                  <br />
                  <span className="text-amber-300">Dream Vacation</span>
                </h2>
                <p className="text-xl text-white/85 mb-8 max-w-lg leading-relaxed">
                  Chat with your AI travel agent to discover unique experiences, find the perfect lodging, and build a complete itinerary — all in one place.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button
                    size="lg"
                    onClick={() => (window.location.href = getLoginUrl())}
                    className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 rounded-xl shadow-xl font-semibold"
                  >
                    <Plane className="w-5 h-5 mr-2" />
                    Start Planning — It's Free
                  </Button>
                </div>
              </div>

              {/* Mascot showcase */}
              <div className="flex gap-6 items-end justify-center">
                {["hula_dancer", "highlander", "gondolier", "geisha"].map((type, i) => (
                  <div
                    key={type}
                    className="flex flex-col items-center gap-2"
                    style={{ transform: `translateY(${i % 2 === 0 ? "0" : "-12px"})` }}
                  >
                    <Mascot mascotType={type} size={i === 0 ? "lg" : "md"} animated />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Features (unauthenticated) ── */}
      {!user && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h3
            className="text-3xl font-bold text-center text-foreground mb-12"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Everything You Need to Plan the Perfect Trip
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "💬",
                title: "Conversational AI Planning",
                desc: "Chat naturally with your AI agent. It guides you step by step through dates, islands, budget, activities, and lodging.",
              },
              {
                icon: "🔍",
                title: "Broad Web Search",
                desc: "AI searches across the entire web — TripAdvisor, Airbnb, local blogs, Facebook, and more — to find hidden gems.",
              },
              {
                icon: "🏝️",
                title: "Island-by-Island Planning",
                desc: "Organize your trip by island with dedicated activities, lodging, and dining for each stop on your journey.",
              },
              {
                icon: "🌺",
                title: "Customizable Mascots",
                desc: "Your travel agent changes personality per destination — a hula dancer for Hawaii, a highlander for Scotland!",
              },
              {
                icon: "📋",
                title: "Itinerary Organizer",
                desc: "Save your favorite finds and organize them into a complete, day-by-day itinerary you can reference anytime.",
              },
              {
                icon: "👨‍👩‍👧‍👦",
                title: "Family Friendly",
                desc: "Designed with large text and simple navigation so everyone from grandparents to grandchildren can use it easily.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Authenticated: My Trips ── */}
      {user && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2
                className="text-3xl font-bold text-foreground"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                My Trips
              </h2>
              <p className="text-muted-foreground mt-1 text-base">
                {trips.length === 0
                  ? "Start planning your first adventure!"
                  : `${trips.length} trip${trips.length !== 1 ? "s" : ""} in progress`}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowNewTrip(true)}
              className="gradient-tropical text-white border-0 shadow-md hover:opacity-90 text-base"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Trip
            </Button>
          </div>

          {/* Trip list */}
          {tripsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
              <Mascot mascotType="hula_dancer" size="lg" animated showMessage />
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Ready for an adventure?
                </h3>
                <p className="text-muted-foreground text-lg max-w-md">
                  Create your first trip and let your AI travel agent help you plan every detail — from activities to lodging to transportation.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setShowNewTrip(true)}
                className="gradient-tropical text-white border-0 shadow-xl text-lg px-8 py-6 rounded-xl"
              >
                <Plane className="w-5 h-5 mr-2" />
                Plan My Hawaii Trip
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onOpen={(id) => navigate(`/trip/${id}`)}
                  onDelete={(id) => setShowDeleteConfirm(id)}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── New Trip Dialog ── */}
      <Dialog open={showNewTrip} onOpenChange={setShowNewTrip}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Plan a New Trip
            </DialogTitle>
            <DialogDescription className="text-base">
              Choose your destination and give your trip a name to get started.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Destination grid */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Choose Destination</Label>
              <div className="grid grid-cols-2 gap-3">
                {DESTINATION_TEMPLATES.map((dest) => (
                  <button
                    key={dest.key}
                    onClick={() => handleSelectDestination(dest.key, dest.defaultTitle)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                      selectedDestKey === dest.key
                        ? "border-primary bg-primary/8 shadow-md"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary"
                    }`}
                  >
                    <span className="text-3xl">{dest.emoji}</span>
                    <span className="font-semibold text-foreground text-sm">{dest.name}</span>
                    <span className="text-xs text-muted-foreground">{dest.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trip title */}
            <div>
              <Label htmlFor="trip-title" className="text-base font-semibold mb-2 block">
                Trip Name
              </Label>
              <Input
                id="trip-title"
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                placeholder="e.g. Hawaii Anniversary Trip"
                className="text-base h-12 rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTrip()}
              />
            </div>

            <Button
              onClick={handleCreateTrip}
              disabled={!tripTitle.trim() || createTrip.isPending}
              size="lg"
              className="w-full gradient-tropical text-white border-0 shadow-md text-base h-12 rounded-xl"
            >
              {createTrip.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating your trip...
                </>
              ) : (
                <>
                  <Plane className="w-5 h-5 mr-2" />
                  Start Planning
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Trip?</DialogTitle>
            <DialogDescription className="text-base">
              This will permanently delete this trip and all its chat history and itinerary items. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteTrip.isPending}
              onClick={() => showDeleteConfirm && deleteTrip.mutate({ id: showDeleteConfirm })}
            >
              {deleteTrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Footer ── */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-muted-foreground text-sm">
          <p>🌺 Aloha Travel Agent — Your Personal AI Trip Planner</p>
          <p className="mt-1">Plan Hawaii, Scotland, Italy, Japan, and beyond.</p>
        </div>
      </footer>
    </div>
  );
}
