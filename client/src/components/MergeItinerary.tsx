import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GitMerge,
  ThumbsUp,
  Star,
  MapPin,
  Hotel,
  Utensils,
  Car,
  StickyNote,
  CheckCircle2,
  Circle,
  Users,
  Trophy,
} from "lucide-react";
import { MemberAvatar } from "./FamilyMembersPanel";

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  activity: { icon: MapPin, label: "Activities", color: "text-emerald-600", bg: "bg-emerald-50" },
  lodging: { icon: Hotel, label: "Lodging", color: "text-purple-600", bg: "bg-purple-50" },
  restaurant: { icon: Utensils, label: "Dining", color: "text-orange-600", bg: "bg-orange-50" },
  transportation: { icon: Car, label: "Transport", color: "text-blue-600", bg: "bg-blue-50" },
  note: { icon: StickyNote, label: "Notes", color: "text-gray-600", bg: "bg-gray-50" },
} as const;

// ─── Item Card ────────────────────────────────────────────────────────────────

function MergeItemCard({
  item,
  member,
  isOwner,
  onVote,
  onPromote,
}: {
  item: any;
  member?: any;
  isOwner: boolean;
  onVote: (id: number) => void;
  onPromote: (id: number) => void;
}) {
  const cat = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.note;
  const Icon = cat.icon;

  return (
    <div className={`border rounded-xl p-4 transition-all ${item.isMaster ? "border-emerald-400 bg-emerald-50/50 shadow-sm" : "border-border hover:border-primary/30"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${cat.bg} flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${cat.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-base leading-tight">{item.title}</h4>
              {item.island && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.island}</p>
              )}
            </div>
            {item.isMaster && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex-shrink-0 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                In Master Plan
              </Badge>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{item.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {item.priceRange && (
              <span className="text-xs font-medium text-muted-foreground">{item.priceRange}</span>
            )}
            {member && (
              <div className="flex items-center gap-1">
                <MemberAvatar name={member.name} color={member.avatarColor} size="sm" />
                <span className="text-xs text-muted-foreground">{member.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <button
          onClick={() => onVote(item.id)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
        >
          <ThumbsUp className="w-4 h-4 group-hover:fill-primary/20" />
          <span className="font-medium">{item.votes || 0}</span>
          <span>votes</span>
        </button>

        {isOwner && !item.isMaster && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => onPromote(item.id)}
          >
            <Star className="w-3 h-3" />
            Add to Master Plan
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MergeItineraryProps {
  tripId: number;
  isOwner: boolean;
}

export function MergeItinerary({ tripId, isOwner }: MergeItineraryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: allItems = [], isLoading } = trpc.itinerary.allMemberItems.useQuery({ tripId });
  const { data: members = [] } = trpc.members.list.useQuery({ tripId });

  const vote = trpc.itinerary.vote.useMutation({
    onSuccess: () => utils.itinerary.allMemberItems.invalidate({ tripId }),
    onError: (e) => toast.error(e.message),
  });

  const promote = trpc.itinerary.promoteToMaster.useMutation({
    onSuccess: () => {
      toast.success("Added to master itinerary!");
      utils.itinerary.allMemberItems.invalidate({ tripId });
    },
    onError: (e) => toast.error(e.message),
  });

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const masterItems = allItems.filter((i) => i.isMaster);
  const memberItems = allItems.filter((i) => !i.isMaster);

  const filteredMemberItems =
    activeCategory === "all"
      ? memberItems
      : memberItems.filter((i) => i.category === activeCategory);

  const categories = ["all", ...Object.keys(CATEGORY_CONFIG)];

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <GitMerge className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
        <p>Loading all member picks...</p>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <h3 className="text-lg font-semibold mb-1">No picks yet</h3>
        <p className="text-sm max-w-sm mx-auto">
          Once family members start saving activities, lodging, and restaurants to their personal lists, they'll appear here for everyone to vote on.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <GitMerge className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Merge & Finalize</h2>
          <p className="text-sm text-muted-foreground">
            Vote on your favorites, then {isOwner ? "add them to the master plan" : "the trip owner will finalize the itinerary"}.
          </p>
        </div>
      </div>

      {/* Master Plan Summary */}
      {masterItems.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
              <Trophy className="w-5 h-5" />
              Master Itinerary
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">{masterItems.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {masterItems.map((item) => {
              const cat = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.note;
              const Icon = cat.icon;
              return (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <Icon className={`w-3.5 h-3.5 ${cat.color} flex-shrink-0`} />
                  <span className="font-medium">{item.title}</span>
                  {item.island && <span className="text-muted-foreground">— {item.island}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const config = cat === "all" ? null : CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
          const count = cat === "all"
            ? memberItems.length
            : memberItems.filter((i) => i.category === cat).length;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/40"
              }`}
            >
              {cat === "all" ? "All Picks" : config?.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Member Items */}
      {filteredMemberItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No picks in this category yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredMemberItems.map((item) => (
            <MergeItemCard
              key={item.id}
              item={item}
              member={item.memberId ? memberMap[item.memberId] : undefined}
              isOwner={isOwner}
              onVote={(id) => vote.mutate({ id })}
              onPromote={(id) => promote.mutate({ id, tripId })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
