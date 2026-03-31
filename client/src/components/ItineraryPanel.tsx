import { useState } from "react";
import { Trash2, MapPin, DollarSign, Calendar, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ItineraryItem } from "../../../drizzle/schema";

const CATEGORY_CONFIG = {
  activity: { icon: "🤿", label: "Activity", color: "bg-blue-50 border-blue-200 text-blue-700" },
  lodging: { icon: "🏨", label: "Lodging", color: "bg-purple-50 border-purple-200 text-purple-700" },
  restaurant: { icon: "🍽️", label: "Dining", color: "bg-orange-50 border-orange-200 text-orange-700" },
  transportation: { icon: "✈️", label: "Transport", color: "bg-green-50 border-green-200 text-green-700" },
  note: { icon: "📝", label: "Note", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
};

const TIME_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  all_day: "All Day",
};

interface ItineraryItemCardProps {
  item: ItineraryItem;
  onRemove: () => void;
}

function ItineraryItemCard({ item, onRemove }: ItineraryItemCardProps) {
  const [removing, setRemoving] = useState(false);
  const removeItem = trpc.itinerary.remove.useMutation({
    onSuccess: () => {
      setRemoving(false);
      onRemove();
      toast.success("Item removed from itinerary");
    },
    onError: () => {
      setRemoving(false);
      toast.error("Couldn't remove item");
    },
  });

  const config = CATEGORY_CONFIG[item.category];

  return (
    <div className="bg-card border border-border rounded-xl p-4 group hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        {/* Category badge */}
        <span
          className={`shrink-0 text-xl w-10 h-10 flex items-center justify-center rounded-lg border ${config.color}`}
        >
          {config.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-base text-foreground leading-tight">{item.title}</h4>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setRemoving(true);
                removeItem.mutate({ id: item.id });
              }}
              disabled={removing}
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
            {item.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {item.location}
              </span>
            )}
            {item.priceRange && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {item.priceRange}
              </span>
            )}
            {item.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {item.date}
              </span>
            )}
            {item.timeOfDay && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {TIME_LABELS[item.timeOfDay]}
              </span>
            )}
          </div>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              View details
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Itinerary Panel ──────────────────────────────────────────────────────────

interface ItineraryPanelProps {
  tripId: number;
  islands: string[];
}

export function ItineraryPanel({ tripId, islands }: ItineraryPanelProps) {
  const [filterIsland, setFilterIsland] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: items = [], isLoading } = trpc.itinerary.list.useQuery({ tripId });

  const filteredItems = items.filter((item) => {
    if (filterIsland !== "all" && item.island !== filterIsland) return false;
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    return true;
  });

  const groupedByIsland = islands.reduce<Record<string, ItineraryItem[]>>((acc, island) => {
    acc[island] = filteredItems.filter((item) => item.island === island);
    return acc;
  }, {});

  const ungrouped = filteredItems.filter((item) => !item.island || !islands.includes(item.island));

  const handleRemove = () => {
    utils.itinerary.list.invalidate({ tripId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="text-6xl">📋</div>
        <h3 className="text-xl font-semibold text-foreground">Your itinerary is empty</h3>
        <p className="text-muted-foreground max-w-sm text-base">
          Use the Search tab to find activities, lodging, and restaurants, then save them here to build your perfect itinerary.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterIsland("all")}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            filterIsland === "all"
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-card border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          All Islands
        </button>
        {islands.map((island) => (
          <button
            key={island}
            onClick={() => setFilterIsland(island)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              filterIsland === island
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            🏝️ {island}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            filterCategory === "all"
              ? "gradient-tropical text-white border-transparent"
              : "bg-card border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          All Types
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              filterCategory === cat
                ? "gradient-tropical text-white border-transparent"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {config.icon} {config.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
          const count = items.filter((i) => i.category === cat).length;
          if (count === 0) return null;
          return (
            <div key={cat} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{config.icon}</div>
              <div className="text-xl font-bold text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Items by island */}
      {filterIsland === "all" ? (
        <>
          {islands.map((island) => {
            const islandItems = groupedByIsland[island] || [];
            if (islandItems.length === 0) return null;
            return (
              <div key={island}>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  🏝️ {island}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({islandItems.length} items)
                  </span>
                </h3>
                <div className="space-y-3">
                  {islandItems.map((item) => (
                    <ItineraryItemCard key={item.id} item={item} onRemove={handleRemove} />
                  ))}
                </div>
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Other</h3>
              <div className="space-y-3">
                {ungrouped.map((item) => (
                  <ItineraryItemCard key={item.id} item={item} onRemove={handleRemove} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ItineraryItemCard key={item.id} item={item} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
