import { useState } from "react";
import { Star, MapPin, DollarSign, Plus, Loader2, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { SearchResultItem } from "../../../drizzle/schema";

const CATEGORY_CONFIG = {
  activity: { label: "Activities", icon: "🤿", color: "text-blue-600 bg-blue-50 border-blue-200" },
  lodging: { label: "Lodging", icon: "🏨", color: "text-purple-600 bg-purple-50 border-purple-200" },
  restaurant: { label: "Dining", icon: "🍽️", color: "text-orange-600 bg-orange-50 border-orange-200" },
  transportation: { label: "Transport", icon: "✈️", color: "text-green-600 bg-green-50 border-green-200" },
};

interface SearchResultCardProps {
  item: SearchResultItem;
  category: "activity" | "lodging" | "restaurant" | "transportation";
  tripId: number;
  island: string;
  onSaved: () => void;
}

function SearchResultCard({ item, category, tripId, island, onSaved }: SearchResultCardProps) {
  const [saving, setSaving] = useState(false);
  const addItem = trpc.itinerary.add.useMutation({
    onSuccess: () => {
      setSaving(false);
      toast.success(`"${item.title}" added to your itinerary!`);
      onSaved();
    },
    onError: () => {
      setSaving(false);
      toast.error("Couldn't save item. Please try again.");
    },
  });

  const handleSave = () => {
    setSaving(true);
    addItem.mutate({
      tripId,
      category,
      title: item.title,
      description: item.description,
      location: item.location,
      island,
      priceRange: item.priceRange,
      url: item.url,
    });
  };

  const stars = Math.round(item.rating || 4);

  return (
    <div className="result-card bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-base text-foreground leading-tight">{item.title}</h4>
        {item.source && (
          <span className="shrink-0 text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full border border-border">
            {item.source}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{item.description}</p>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {item.location && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            {item.location}
          </span>
        )}
        {item.priceRange && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            {item.priceRange}
          </span>
        )}
        {item.rating && (
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            {item.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full border border-border"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="flex-1 gradient-tropical text-white border-0 hover:opacity-90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Save to Itinerary
        </Button>
        {item.url && (
          <Button
            variant="outline"
            size="sm"
            className="px-3"
            onClick={() => window.open(item.url, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Search Panel ─────────────────────────────────────────────────────────────

interface SearchPanelProps {
  tripId: number;
  islands: string[];
  budget?: string;
}

export function SearchPanel({ tripId, islands, budget }: SearchPanelProps) {
  const [activeCategory, setActiveCategory] = useState<"activity" | "lodging" | "restaurant" | "transportation">("activity");
  const [activeIsland, setActiveIsland] = useState(islands[0] || "Oahu");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const utils = trpc.useUtils();

  const searchMutation = trpc.search.find.useMutation({
    onSuccess: (data) => {
      setResults(data);
      setIsSearching(false);
      setHasSearched(true);
    },
    onError: () => {
      toast.error("Search failed. Please try again.");
      setIsSearching(false);
    },
  });

  const handleSearch = () => {
    setIsSearching(true);
    setHasSearched(false);
    searchMutation.mutate({
      tripId,
      category: activeCategory,
      island: activeIsland,
      budget,
    });
  };

  const config = CATEGORY_CONFIG[activeCategory];

  return (
    <div className="flex flex-col gap-4">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((cat) => {
          const c = CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setHasSearched(false); setResults([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "gradient-tropical text-white border-transparent shadow-md"
                  : "bg-card border-border text-foreground hover:bg-secondary"
              }`}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Island selector */}
      {islands.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {islands.map((island) => (
            <button
              key={island}
              onClick={() => { setActiveIsland(island); setHasSearched(false); setResults([]); }}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                activeIsland === island
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              🏝️ {island}
            </button>
          ))}
        </div>
      )}

      {/* Search button */}
      <Button
        onClick={handleSearch}
        disabled={isSearching}
        size="lg"
        className="gradient-tropical text-white border-0 shadow-md hover:opacity-90 text-base"
      >
        {isSearching ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Searching across the web...
          </>
        ) : (
          <>
            <Search className="w-5 h-5 mr-2" />
            Find {config.label} on {activeIsland}
          </>
        )}
      </Button>

      {/* Results grid */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-base">
            Searching across the web for the best {config.label.toLowerCase()} on {activeIsland}...
          </p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
      )}

      {hasSearched && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg">No results found. Try a different category or island.</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Found <strong>{results.length}</strong> {config.label.toLowerCase()} options on {activeIsland}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((item, i) => (
              <SearchResultCard
                key={i}
                item={item}
                category={activeCategory}
                tripId={tripId}
                island={activeIsland}
                onSaved={() => utils.itinerary.list.invalidate({ tripId })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
