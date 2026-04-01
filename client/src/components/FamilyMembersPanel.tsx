import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Crown,
  Edit3,
  Eye,
  Trash2,
  Link2,
  Copy,
  Check,
  MapPin,
  Hotel,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: number;
  name: string;
  email?: string | null;
  role: "owner" | "planner" | "viewer";
  planningPath: "activities_first" | "lodging_first";
  planningStage: string;
  avatarColor: string;
  planningComplete: boolean;
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Member["role"] }) {
  const config = {
    owner: { label: "Owner", icon: Crown, className: "bg-amber-100 text-amber-800 border-amber-200" },
    planner: { label: "Planner", icon: Edit3, className: "bg-blue-100 text-blue-800 border-blue-200" },
    viewer: { label: "Viewer", icon: Eye, className: "bg-gray-100 text-gray-600 border-gray-200" },
  }[role];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ─── Planning Path Badge ──────────────────────────────────────────────────────

function PathBadge({ path }: { path: Member["planningPath"] }) {
  const isActivities = path === "activities_first";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${isActivities ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
      {isActivities ? <MapPin className="w-3 h-3" /> : <Hotel className="w-3 h-3" />}
      {isActivities ? "Activities First" : "Lodging First"}
    </span>
  );
}

// ─── Member Avatar ────────────────────────────────────────────────────────────

function MemberAvatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-14 h-14 text-xl" }[size];

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// ─── Add Member Dialog ────────────────────────────────────────────────────────

function AddMemberDialog({ tripId, onAdded }: { tripId: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"planner" | "viewer">("planner");
  const [path, setPath] = useState<"activities_first" | "lodging_first">("activities_first");

  const addMember = trpc.members.add.useMutation({
    onSuccess: () => {
      toast.success(`${name} added to the trip!`);
      setOpen(false);
      setName("");
      setEmail("");
      onAdded();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add a Family Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-base font-medium">Full Name *</Label>
            <Input
              placeholder="e.g. Margaret"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base h-11"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-base font-medium">Email (optional)</Label>
            <Input
              type="email"
              placeholder="e.g. margaret@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base h-11"
            />
            <p className="text-sm text-muted-foreground">Used to send them an invite link</p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-base font-medium">Permission Level</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("planner")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${role === "planner" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <Edit3 className="w-5 h-5 mb-1 text-blue-600" />
                <div className="font-semibold text-sm">Planner</div>
                <div className="text-xs text-muted-foreground mt-0.5">Can add & edit items</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("viewer")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${role === "viewer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <Eye className="w-5 h-5 mb-1 text-gray-500" />
                <div className="font-semibold text-sm">Viewer</div>
                <div className="text-xs text-muted-foreground mt-0.5">Can only view the trip</div>
              </button>
            </div>
            {role === "viewer" && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                👀 Good for grandkids or guests who should see the plan but not change it.
              </p>
            )}
          </div>

          {/* Planning Path — only for planners */}
          {role === "planner" && (
            <div className="space-y-1.5">
              <Label className="text-base font-medium">How would they like to plan?</Label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setPath("activities_first")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${path === "activities_first" ? "border-emerald-500 bg-emerald-50" : "border-border hover:border-emerald-300"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-sm">Activities First</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Dates → Islands → Budget → Activities → Restaurants → Lodging → Transport
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPath("lodging_first")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${path === "lodging_first" ? "border-purple-500 bg-purple-50" : "border-border hover:border-purple-300"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Hotel className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-sm">Lodging First</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Dates → Islands → Budget → Lodging → Transport → Activities → Restaurants
                  </div>
                </button>
              </div>
            </div>
          )}

          <Button
            className="w-full h-11 text-base"
            onClick={() => addMember.mutate({ tripId, name, email: email || undefined, role, planningPath: path })}
            disabled={!name.trim() || addMember.isPending}
          >
            {addMember.isPending ? "Adding..." : `Add ${name || "Member"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invite Link Dialog ───────────────────────────────────────────────────────

function InviteLinkDialog({ tripId }: { tripId: number }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"planner" | "viewer">("planner");
  const [inviteeName, setInviteeName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvite = trpc.invites.create.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.token);
    },
    onError: (e) => toast.error(e.message),
  });

  const inviteUrl = generatedToken
    ? `${window.location.origin}/join/${generatedToken}`
    : null;

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Invite link copied!");
    }
  };

  const handleGenerate = () => {
    createInvite.mutate({
      tripId,
      role,
      inviteeName: inviteeName || undefined,
      expiresInDays: 30,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setGeneratedToken(null); setInviteeName(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="w-4 h-4" />
          Invite Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Create an Invite Link</DialogTitle>
        </DialogHeader>

        {!generatedToken ? (
          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-base font-medium">Person's Name (optional)</Label>
              <Input
                placeholder="e.g. Grandma Rose"
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                className="text-base h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-base font-medium">Permission Level</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("planner")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${role === "planner" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Edit3 className="w-4 h-4 mb-1 text-blue-600" />
                  <div className="font-semibold text-sm">Planner</div>
                  <div className="text-xs text-muted-foreground">Can add items</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("viewer")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${role === "viewer" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Eye className="w-4 h-4 mb-1 text-gray-500" />
                  <div className="font-semibold text-sm">Viewer</div>
                  <div className="text-xs text-muted-foreground">View only</div>
                </button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              The link will expire in 30 days. Anyone with the link can join the trip.
            </p>

            <Button
              className="w-full h-11 text-base"
              onClick={handleGenerate}
              disabled={createInvite.isPending}
            >
              {createInvite.isPending ? "Generating..." : "Generate Invite Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-800 mb-2">✅ Invite link ready!</p>
              <p className="text-xs text-emerald-700">Share this link with your family member. It expires in 30 days.</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={inviteUrl || ""}
                readOnly
                className="text-sm font-mono bg-muted"
              />
              <Button variant="outline" size="icon" onClick={handleCopy} className="flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setGeneratedToken(null); setInviteeName(""); }}
            >
              Create Another Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FamilyMembersPanelProps {
  tripId: number;
  isOwner: boolean;
  onSelectMember?: (memberId: number) => void;
  selectedMemberId?: number | null;
}

export function FamilyMembersPanel({
  tripId,
  isOwner,
  onSelectMember,
  selectedMemberId,
}: FamilyMembersPanelProps) {
  const utils = trpc.useUtils();

  const { data: members = [], isLoading } = trpc.members.list.useQuery({ tripId });

  const removeMember = trpc.members.remove.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.members.list.invalidate({ tripId });
    },
    onError: (e) => toast.error(e.message),
  });

  const refresh = () => utils.members.list.invalidate({ tripId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading members...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Trip Members
            <span className="text-sm font-normal text-muted-foreground">({members.length})</span>
          </CardTitle>
          {isOwner && (
            <div className="flex gap-2">
              <InviteLinkDialog tripId={tripId} />
              <AddMemberDialog tripId={tripId} onAdded={refresh} />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No members yet. Add family members to plan together!</p>
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                selectedMemberId === member.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
              onClick={() => onSelectMember?.(member.id)}
            >
              <MemberAvatar name={member.name} color={member.avatarColor} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base truncate">{member.name}</span>
                  <RoleBadge role={member.role} />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {member.role !== "viewer" && <PathBadge path={member.planningPath} />}
                  {member.planningComplete && (
                    <span className="text-xs text-emerald-600 font-medium">✓ Planning done</span>
                  )}
                  {member.email && (
                    <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {onSelectMember && (
                  <ChevronRight className={`w-4 h-4 transition-colors ${selectedMemberId === member.id ? "text-primary" : "text-muted-foreground"}`} />
                )}
                {isOwner && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove ${member.name} from this trip?`)) {
                        removeMember.mutate({ id: member.id, tripId });
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export { MemberAvatar };
