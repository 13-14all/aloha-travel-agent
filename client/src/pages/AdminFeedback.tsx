/**
 * AdminFeedback.tsx
 *
 * Admin-only "Make Changes / Update" page.
 * - Opens in a new browser window so admins never lose their place
 * - Any authenticated user can submit a request
 * - Only admins (role=admin) can see the full list and update statuses
 * - Accessible via the "Suggest a Change" button in the top nav
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  X,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Wrench,
  Bug,
  Lightbulb,
  HelpCircle,
  Crown,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "bg-gray-100 text-gray-700 border-gray-200",   dot: "bg-gray-400" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  high:   { label: "High",   color: "bg-red-100 text-red-700 border-red-200",      dot: "bg-red-500" },
};

const CATEGORY_CONFIG = {
  bug:         { label: "Bug Fix",     icon: <Bug className="w-4 h-4" />,           color: "text-red-600" },
  feature:     { label: "New Feature", icon: <Plus className="w-4 h-4" />,          color: "text-blue-600" },
  improvement: { label: "Improvement", icon: <Wrench className="w-4 h-4" />,        color: "text-violet-600" },
  question:    { label: "Question",    icon: <HelpCircle className="w-4 h-4" />,    color: "text-gray-600" },
};

const STATUS_CONFIG = {
  "pending":    { label: "Pending",     icon: <Clock className="w-4 h-4" />,        color: "bg-gray-100 text-gray-700" },
  "in-progress":{ label: "In Progress", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "bg-blue-100 text-blue-700" },
  "done":       { label: "Done",        icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-emerald-100 text-emerald-700" },
  "wont-do":    { label: "Won't Do",    icon: <X className="w-4 h-4" />,            color: "bg-gray-100 text-gray-500" },
};

// ─── Submit Form ──────────────────────────────────────────────────────────────

function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState<"bug" | "feature" | "improvement" | "question">("feature");

  const submit = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("Request submitted! We'll review it soon.");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setCategory("feature");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in both the title and description.");
      return;
    }
    submit.mutate({ title: title.trim(), description: description.trim(), priority, category });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div>
        <label className="block text-base font-semibold text-foreground mb-2">
          What kind of change is this?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                category === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span className={cfg.color}>{cfg.icon}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-base font-semibold text-foreground mb-2">
          How urgent is this?
        </label>
        <div className="flex gap-2">
          {(Object.entries(PRIORITY_CONFIG) as [keyof typeof PRIORITY_CONFIG, typeof PRIORITY_CONFIG[keyof typeof PRIORITY_CONFIG]][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPriority(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                priority === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-base font-semibold text-foreground mb-2">
          Short title <span className="text-red-500">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Add a packing list feature"
          maxLength={256}
          className="w-full text-base border border-border rounded-xl px-4 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-base font-semibold text-foreground mb-2">
          Tell us more <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you'd like changed, what's not working, or what would make the app better…"
          rows={5}
          className="w-full text-base border border-border rounded-xl px-4 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={submit.isPending}
        className="w-full h-12 text-base gap-2"
      >
        {submit.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <MessageSquarePlus className="w-5 h-5" />
        )}
        Submit Request
      </Button>
    </form>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  req,
  isAdmin,
}: {
  req: {
    id: number;
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    category: "bug" | "feature" | "improvement" | "question";
    status: "pending" | "in-progress" | "done" | "wont-do";
    adminNotes: string | null;
    userName: string | null;
    createdAt: Date;
  };
  isAdmin: boolean;
}) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(req.adminNotes || "");

  const updateMutation = trpc.feedback.update.useMutation({
    onSuccess: () => {
      utils.feedback.list.invalidate();
      toast.success("Updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const pCfg = PRIORITY_CONFIG[req.priority];
  const cCfg = CATEGORY_CONFIG[req.category];
  const sCfg = STATUS_CONFIG[req.status];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-0.5 ${cCfg.color}`}>{cCfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground text-base">{req.title}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${pCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
              {pCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sCfg.color}`}>
              {sCfg.icon}
              {sCfg.label}
            </span>
            {req.userName && (
              <span className="text-xs text-muted-foreground">by {req.userName}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">
          <p className="text-base text-foreground leading-relaxed">{req.description}</p>

          {/* Admin controls */}
          {isAdmin && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                Admin Controls
              </p>

              {/* Status selector */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updateMutation.mutate({ id: req.id, status: key })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        req.status === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin notes */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Admin Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note about this request…"
                  rows={2}
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateMutation.mutate({ id: req.id, adminNotes: notes })}
                  disabled={updateMutation.isPending}
                  className="mt-2 h-8 text-xs"
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}

          {/* Show admin notes to everyone if they exist */}
          {!isAdmin && req.adminNotes && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Response from admin:</p>
              <p className="text-sm text-blue-800">{req.adminNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminFeedback() {
  const { user, isAuthenticated, loading } = useAuth();
  const [showForm, setShowForm] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isAdmin = user?.role === "admin";
  const isPopup = window.opener !== null;

  const { data: requests, isLoading: loadingRequests } = trpc.feedback.list.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  // Non-admins see their own submissions
  const { data: myRequests, isLoading: loadingMyRequests } = trpc.feedback.myList.useQuery(
    undefined,
    { enabled: !isAdmin && isAuthenticated }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to submit a change request.</p>
          <Button onClick={() => window.close()} variant="outline" className="h-11 text-base">
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  const filteredRequests = (requests ?? []).filter((r) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  const pendingCount = (requests ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛠️</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">Suggest a Change</h1>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? "Admin view — submit and manage requests" : "Submit ideas, bugs, or questions"}
              </p>
            </div>
          </div>
          {isPopup && (
            <Button variant="ghost" size="sm" onClick={() => window.close()} className="gap-1 h-9">
              <X className="w-4 h-4" />
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ── Submit new request ── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquarePlus className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold text-foreground">Submit a New Request</span>
            </div>
            {showForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {showForm && (
            <div className="px-5 pb-5 border-t border-border pt-4">
              <SubmitForm onSuccess={() => setShowForm(false)} />
            </div>
          )}
        </div>

        {/* ── Request history (admin only) ── */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                All Requests
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
                )}
              </h2>

              {/* Status filter */}
              <div className="flex gap-1.5 flex-wrap">
                {["all", "pending", "in-progress", "done"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      filterStatus === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {s === "all" ? "All" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}
                  </button>
                ))}
              </div>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-10 bg-card border border-border rounded-2xl">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-muted-foreground">No requests in this category</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={{
                      ...req,
                      priority: req.priority as "low" | "medium" | "high",
                      category: req.category as "bug" | "feature" | "improvement" | "question",
                      status: req.status as "pending" | "in-progress" | "done" | "wont-do",
                    }}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Non-admin: show their own submissions */}
        {!isAdmin && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-base text-blue-800 font-medium">Your requests go directly to Alex and Tami.</p>
                <p className="text-sm text-blue-700 mt-0.5">They review all submissions and will update the app accordingly.</p>
              </div>
            </div>

            {/* My submitted requests */}
            <h2 className="text-lg font-bold text-foreground">My Submissions</h2>
            {loadingMyRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !myRequests || myRequests.length === 0 ? (
              <div className="text-center py-8 bg-card border border-border rounded-2xl">
                <div className="text-3xl mb-2">📬</div>
                <p className="text-muted-foreground">No submissions yet — use the form above to send your first idea!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={{
                      ...req,
                      priority: req.priority as "low" | "medium" | "high",
                      category: req.category as "bug" | "feature" | "improvement" | "question",
                      status: req.status as "pending" | "in-progress" | "done" | "wont-do",
                    }}
                    isAdmin={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
