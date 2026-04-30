import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Mascot } from "@/components/Mascot";
import { MapPin, Hotel, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function JoinTrip() {
  const [, params] = useRoute("/join/:token");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const token = params?.token || "";

  const [name, setName] = useState((user as any)?.displayName || user?.name || "");
  const [planningPath, setPlanningPath] = useState<"activities_first" | "lodging_first">("activities_first");
  const [joined, setJoined] = useState(false);
  const [joinedTripId, setJoinedTripId] = useState<number | null>(null);

  const { data: invite, isLoading: inviteLoading, error: inviteError } = trpc.invites.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const acceptInvite = trpc.invites.accept.useMutation({
    onSuccess: (data) => {
      setJoined(true);
      setJoinedTripId(data.tripId);
    },
    onError: (e) => {
      console.error("Failed to accept invite:", e);
    },
  });

  if (authLoading || inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-tropical flex items-center justify-center text-3xl animate-pulse">
            🌺
          </div>
          <p className="text-muted-foreground text-lg">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invitation Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {inviteError.message || "This invite link may have expired or already been used."}
          </p>
          <Button onClick={() => navigate("/")}>Go to Aloha Travel Agent</Button>
        </div>
      </div>
    );
  }

  if (joined && joinedTripId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You're in! 🌺</h1>
          <p className="text-muted-foreground mb-6">
            Welcome to <strong>{invite?.tripTitle}</strong>! You've joined as a{" "}
            <strong>{invite?.invite.role}</strong>. Time to start planning!
          </p>
          <Button
            className="w-full h-12 text-base"
            onClick={() => navigate(`/trip/${joinedTripId}`)}
          >
            Open Trip Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🌺</div>
            <h1 className="text-2xl font-bold mb-2">You're invited!</h1>
            <p className="text-muted-foreground">
              {invite?.invite.inviteeName
                ? `${invite.invite.inviteeName}, you've been invited to join`
                : "You've been invited to join"}{" "}
              <strong>{invite?.tripTitle}</strong> on Aloha Travel Agent.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to accept your invitation and start planning!
            </p>
            <Button
              className="w-full h-12 text-base"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Sign In to Accept Invite
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌺</div>
          <h1 className="text-3xl font-bold mb-2">You're invited!</h1>
          <p className="text-lg text-muted-foreground">
            Join <strong className="text-foreground">{invite?.tripTitle}</strong>
            {invite?.tripDestination && (
              <span> — {invite.tripDestination}</span>
            )}
          </p>
          {invite?.invite.role && (
            <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
              You'll join as a <strong>{invite.invite.role}</strong>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Your Name</Label>
            <Input
              placeholder="e.g. Grandma Rose"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base h-12"
            />
            <p className="text-sm text-muted-foreground">
              This is how you'll appear to other trip members.
            </p>
          </div>

          {/* Planning path — only for planners */}
          {invite?.invite.role === "planner" && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">How would you like to plan?</Label>
              <p className="text-sm text-muted-foreground">
                Choose the order that feels most natural to you. You can always change this later.
              </p>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setPlanningPath("activities_first")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    planningPath === "activities_first"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-border hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-base">Activities First</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start by exploring what to do and see, then find the perfect place to stay.
                  </p>
                  <p className="text-xs text-emerald-600 font-medium mt-2">
                    Dates → Islands → Budget → Activities → Dining → Lodging → Transport
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPlanningPath("lodging_first")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    planningPath === "lodging_first"
                      ? "border-purple-500 bg-purple-50"
                      : "border-border hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Hotel className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-base">Lodging First</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Find the perfect home base first, then plan activities around it.
                  </p>
                  <p className="text-xs text-purple-600 font-medium mt-2">
                    Dates → Islands → Budget → Lodging → Transport → Activities → Dining
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Accept button */}
          <Button
            className="w-full h-12 text-base"
            onClick={() =>
              acceptInvite.mutate({
                token,
                name: name.trim() || (user as any).displayName || user.name || "Traveler",
                planningPath,
              })
            }
            disabled={!name.trim() || acceptInvite.isPending}
          >
            {acceptInvite.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join the Trip! 🌺"
            )}
          </Button>

          {acceptInvite.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {acceptInvite.error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
