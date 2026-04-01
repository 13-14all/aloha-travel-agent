import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  MessageSquare,
  Search,
  List,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  GitMerge,
  ChevronDown,
  ChevronUp,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChatInterface } from "@/components/ChatInterface";
import { SearchPanel } from "@/components/SearchResults";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { PlanningProgress } from "@/components/PlanningProgress";
import { Mascot } from "@/components/Mascot";
import { TripSummaryCard } from "@/components/TripSummaryCard";
import { FamilyMembersPanel } from "@/components/FamilyMembersPanel";
import { MergeItinerary } from "@/components/MergeItinerary";
import { PdfExport } from "@/components/PdfExport";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type TabType = "chat" | "search" | "itinerary" | "family" | "merge";

export default function TripDashboard() {
  const [, params] = useRoute("/trip/:id");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [showDetails, setShowDetails] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<number | null>(null);
  const tripId = params?.id ? parseInt(params.id) : null;

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trips.get.useQuery(
    { id: tripId! },
    { enabled: !!tripId && !!user }
  );

  const { data: members = [] } = trpc.members.list.useQuery(
    { tripId: tripId! },
    { enabled: !!tripId && !!user }
  );

  const { data: myMember } = trpc.members.myMember.useQuery(
    { tripId: tripId! },
    { enabled: !!tripId && !!user }
  );

  const { data: itineraryItems = [] } = trpc.itinerary.list.useQuery(
    { tripId: tripId! },
    { enabled: !!tripId && !!user }
  );

  // Set active member to self on load
  useEffect(() => {
    if (myMember && activeMemberId === null) {
      setActiveMemberId(myMember.id);
    }
  }, [myMember]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-tropical flex items-center justify-center text-3xl animate-pulse">
            🌺
          </div>
          <p className="text-muted-foreground text-lg">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl mb-4">Please sign in to view your trip</p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl mb-4">Trip not found</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isOwner = trip.userId === user.id;
  const islands = (trip.islands as string[]) || [];
  const budgetStr =
    trip.budgetMin && trip.budgetMax
      ? `$${trip.budgetMin.toLocaleString()} – $${trip.budgetMax.toLocaleString()}`
      : null;

  const activeMember = activeMemberId ? members.find((m) => m.id === activeMemberId) : null;

  // Build tabs dynamically
  const TABS: { key: TabType; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { key: "chat", label: "Chat with Leilani", icon: <MessageSquare className="w-5 h-5" /> },
    { key: "search", label: "Search & Discover", icon: <Search className="w-5 h-5" /> },
    { key: "itinerary", label: "My Itinerary", icon: <List className="w-5 h-5" /> },
    { key: "family", label: "Family", icon: <Users className="w-5 h-5" /> },
    { key: "merge", label: "Merge & Finalize", icon: <GitMerge className="w-5 h-5" />, ownerOnly: false },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">My Trips</span>
            </Button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Mascot mascotType={trip.mascotType} size="sm" animated />
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate leading-tight">
                  {trip.title}
                </h1>
                <p className="text-sm text-muted-foreground truncate">{trip.destination}</p>
              </div>
            </div>

            {/* Member count badge */}
            {members.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-full text-sm">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">{members.length} members</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="shrink-0 text-muted-foreground"
            >
              {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              <span className="hidden sm:inline ml-1">Details</span>
            </Button>
          </div>

          {showDetails && (
            <div className="pb-4 pt-2 border-t border-border/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {trip.startDate && trip.endDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dates</p>
                      <p className="font-medium text-foreground text-sm">
                        {trip.startDate} – {trip.endDate}
                      </p>
                    </div>
                  </div>
                )}
                {islands.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Islands</p>
                      <p className="font-medium text-foreground text-sm">{islands.join(", ")}</p>
                    </div>
                  </div>
                )}
                {budgetStr && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="font-medium text-foreground text-sm">{budgetStr}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Travelers</p>
                    <p className="font-medium text-foreground text-sm">{trip.guestCount || 2} people</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 gap-4">
        {/* ── Left Sidebar (desktop) ── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <PlanningProgress currentStage={trip.planningStage as any} />
          </div>
          <TripSummaryCard trip={trip} />
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Itinerary Summary
            </h3>
            <div className="space-y-2">
              {["activity", "lodging", "restaurant", "transportation"].map((cat) => {
                const count = itineraryItems.filter((i) => i.category === cat).length;
                const icons: Record<string, string> = { activity: "🤿", lodging: "🏨", restaurant: "🍽️", transportation: "✈️" };
                const labels: Record<string, string> = { activity: "Activities", lodging: "Lodging", restaurant: "Dining", transportation: "Transport" };
                return (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span>{icons[cat]}</span>
                      {labels[cat]}
                    </span>
                    <span className={`font-semibold ${count > 0 ? "text-primary" : "text-muted-foreground/40"}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Tab navigation */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-4 border border-border overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Member selector (shown in Chat tab when there are multiple members) ── */}
          {activeTab === "chat" && members.length > 1 && (
            <div className="mb-3 bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                Planning as:
              </p>
              <div className="flex gap-2 flex-wrap">
                {members.filter((m) => m.role !== "viewer").map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMemberId(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      activeMemberId === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      {m.name[0].toUpperCase()}
                    </span>
                    {m.name}
                    {m.role === "owner" && <Crown className="w-3 h-3 text-amber-500" />}
                    {m.planningPath === "lodging_first" && (
                      <span className="text-xs text-purple-600">🏨</span>
                    )}
                  </button>
                ))}
              </div>
              {activeMember && (
                <p className="text-xs text-muted-foreground mt-2">
                  {activeMember.name}'s path:{" "}
                  <span className="font-medium text-foreground">
                    {activeMember.planningPath === "lodging_first" ? "Lodging First 🏨" : "Activities First 🗺️"}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden">
            {activeTab === "chat" && (
              <div className="h-full flex flex-col" style={{ minHeight: "600px" }}>
                <ChatInterface
                  trip={trip}
                  onTripUpdate={refetch}
                  memberId={activeMemberId}
                  memberName={activeMember?.name}
                />
              </div>
            )}

            {activeTab === "search" && (
              <div className="p-4 sm:p-6 overflow-y-auto" style={{ minHeight: "600px" }}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-foreground">Search & Discover</h2>
                  <p className="text-muted-foreground mt-1">
                    AI-powered search across the web to find the best experiences, lodging, and dining.
                  </p>
                </div>
                <SearchPanel
                  tripId={trip.id}
                  islands={islands.length > 0 ? islands : ["Oahu", "Big Island"]}
                  budget={budgetStr || undefined}
                  memberId={activeMemberId}
                />
              </div>
            )}

            {activeTab === "itinerary" && (
              <div className="p-4 sm:p-6 overflow-y-auto" style={{ minHeight: "600px" }}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-foreground">My Itinerary</h2>
                  <p className="text-muted-foreground mt-1">
                    Your saved activities, lodging, dining, and transportation plans.
                  </p>
                </div>
                <ItineraryPanel
                  tripId={trip.id}
                  islands={islands.length > 0 ? islands : ["Oahu", "Big Island"]}
                  memberId={activeMemberId}
                />
              </div>
            )}

            {activeTab === "family" && (
              <div className="p-4 sm:p-6 overflow-y-auto" style={{ minHeight: "600px" }}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-foreground">Family Members</h2>
                  <p className="text-muted-foreground mt-1">
                    Manage who's planning this trip and their roles.
                  </p>
                </div>
                <FamilyMembersPanel
                  tripId={trip.id}
                  isOwner={isOwner}
                  selectedMemberId={activeMemberId}
                  onSelectMember={(id) => {
                    setActiveMemberId(id);
                    setActiveTab("chat");
                  }}
                />

                {/* Planning path explanation */}
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <h3 className="font-semibold text-emerald-800 mb-1">🗺️ Activities First</h3>
                    <p className="text-sm text-emerald-700">
                      Start by exploring what to do and see, then find the perfect place to stay around those activities.
                    </p>
                    <p className="text-xs text-emerald-600 mt-2 font-medium">
                      Dates → Islands → Budget → Activities → Dining → Lodging → Transport
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 className="font-semibold text-purple-800 mb-1">🏨 Lodging First</h3>
                    <p className="text-sm text-purple-700">
                      Find the ideal home base first — the right location and comfort level — then plan activities around it.
                    </p>
                    <p className="text-xs text-purple-600 mt-2 font-medium">
                      Dates → Islands → Budget → Lodging → Transport → Activities → Dining
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "merge" && (
              <div className="p-4 sm:p-6 overflow-y-auto" style={{ minHeight: "600px" }}>
                <div className="flex items-center justify-between mb-4">
                  <div />
                  <PdfExport tripId={trip.id} />
                </div>
                <MergeItinerary tripId={trip.id} isOwner={isOwner} />
              </div>
            )}
          </div>

          {/* Mobile planning progress */}
          <div className="lg:hidden mt-4 bg-card border border-border rounded-2xl p-4">
            <PlanningProgress currentStage={trip.planningStage as any} compact />
          </div>
        </main>
      </div>
    </div>
  );
}
