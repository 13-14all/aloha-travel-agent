import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetItem {
  id: number;
  title: string;
  category: string;
  island: string | null;
  estimatedCost: number | null;
  costNotes: string | null;
  priceRange: string | null;
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  activity:       { label: "Activities",      emoji: "🤿", color: "text-emerald-600" },
  lodging:        { label: "Lodging",         emoji: "🏨", color: "text-blue-600" },
  restaurant:     { label: "Dining",          emoji: "🍽️", color: "text-orange-600" },
  transportation: { label: "Transportation",  emoji: "✈️", color: "text-purple-600" },
  note:           { label: "Notes",           emoji: "📝", color: "text-gray-500" },
};

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ─── Inline Cost Editor ───────────────────────────────────────────────────────

function CostEditor({ item, onSaved }: { item: BudgetItem; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState(item.estimatedCost?.toString() ?? "");
  const [notes, setNotes] = useState(item.costNotes ?? "");
  const utils = trpc.useUtils();

  const updateItem = trpc.itinerary.update.useMutation({
    onSuccess: () => {
      utils.budget.summary.invalidate();
      utils.itinerary.list.invalidate();
      setEditing(false);
      onSaved();
      toast.success("Cost updated");
    },
    onError: () => toast.error("Failed to update cost"),
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        {item.estimatedCost !== null ? (
          <span className="font-semibold text-sm text-foreground">{fmt(item.estimatedCost)}</span>
        ) : (
          <span className="text-xs text-muted-foreground italic">No estimate</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Edit cost"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">$</span>
        <Input
          type="number"
          min="0"
          step="1"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-20 h-7 text-xs px-2"
          placeholder="0"
          autoFocus
        />
      </div>
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-28 h-7 text-xs px-2"
        placeholder="per person…"
      />
      <button
        onClick={() =>
          updateItem.mutate({
            id: item.id,
            estimatedCost: cost ? parseFloat(cost) : null,
            costNotes: notes || undefined,
          })
        }
        disabled={updateItem.isPending}
        className="text-emerald-600 hover:text-emerald-700"
        title="Save"
      >
        {updateItem.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-muted-foreground hover:text-destructive"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  total,
  uncosted,
  onSaved,
}: {
  category: string;
  items: BudgetItem[];
  total: number;
  uncosted: number;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const config = CATEGORY_CONFIG[category] || { label: category, emoji: "📌", color: "text-foreground" };

  if (items.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/60 transition-colors group">
          <div className="flex items-center gap-2">
            <span className="text-base">{config.emoji}</span>
            <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
            <Badge variant="secondary" className="text-xs h-4 px-1.5">
              {items.length}
            </Badge>
            {uncosted > 0 && (
              <Badge variant="outline" className="text-xs h-4 px-1.5 text-amber-600 border-amber-300">
                {uncosted} uncosted
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{fmt(total)}</span>
            {open ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 ml-3 space-y-1 border-l-2 border-border pl-3 pb-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                {item.island && (
                  <p className="text-xs text-muted-foreground">📍 {item.island}</p>
                )}
                {item.costNotes && (
                  <p className="text-xs text-muted-foreground italic">{item.costNotes}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                <CostEditor item={item} onSaved={onSaved} />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Budget Tracker (Sidebar Widget) ─────────────────────────────────────────

interface BudgetTrackerProps {
  tripId: number;
  budgetMax?: number | null;
  budgetMin?: number | null;
  compact?: boolean;
}

export function BudgetTracker({ tripId, budgetMax, budgetMin, compact = false }: BudgetTrackerProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.budget.summary.useQuery(
    { tripId },
    { refetchInterval: false }
  );

  const handleSaved = () => {
    utils.budget.summary.invalidate({ tripId });
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const effectiveBudgetMax = data.budgetMax ?? budgetMax ?? null;
  const percent = data.percentUsed ?? (effectiveBudgetMax ? Math.min((data.grandTotal / effectiveBudgetMax) * 100, 100) : null);

  // Color coding
  const barColor =
    data.isOverBudget
      ? "bg-red-500"
      : percent !== null && percent >= 75
      ? "bg-amber-500"
      : "bg-emerald-500";

  const statusColor =
    data.isOverBudget
      ? "text-red-600"
      : percent !== null && percent >= 75
      ? "text-amber-600"
      : "text-emerald-600";

  // Group items by category for the detail view
  const itemsByCategory: Record<string, BudgetItem[]> = {};
  for (const item of data.items) {
    if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
    itemsByCategory[item.category].push(item);
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-bold text-base">Budget</span>
          </div>
          {data.totalItems > 0 && (
            <button
              onClick={() => setDetailOpen(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Edit costs
            </button>
          )}
        </div>

        {/* Total spent */}
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <div>
              <span className={`text-2xl font-bold ${statusColor}`}>
                {fmt(data.grandTotal)}
              </span>
              {effectiveBudgetMax && (
                <span className="text-sm text-muted-foreground ml-1">
                  / {fmt(effectiveBudgetMax)}
                </span>
              )}
            </div>
            {data.isOverBudget && (
              <div className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Over budget!
              </div>
            )}
          </div>

          {/* Progress bar */}
          {effectiveBudgetMax && percent !== null && (
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          )}

          {/* Remaining */}
          {effectiveBudgetMax && data.remaining !== null && (
            <p className={`text-xs mt-1 font-medium ${statusColor}`}>
              {data.isOverBudget
                ? `${fmt(Math.abs(data.remaining))} over budget`
                : `${fmt(data.remaining)} remaining`}
            </p>
          )}

          {!effectiveBudgetMax && (
            <p className="text-xs text-muted-foreground mt-1">
              Set a budget in the chat to see your progress
            </p>
          )}
        </div>

        {/* Category mini-bars */}
        {!compact && data.totalItems > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
              const catData = data.categoryTotals[cat as keyof typeof data.categoryTotals];
              if (!catData || catData.count === 0) return null;
              return (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>{config.emoji}</span>
                    {config.label}
                  </span>
                  <span className="font-medium text-foreground">
                    {catData.total > 0 ? fmt(catData.total) : (
                      <span className="text-muted-foreground italic text-xs">
                        {catData.count} item{catData.count !== 1 ? "s" : ""}, no estimate
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Uncosted warning */}
        {data.totalUncosted > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>{data.totalUncosted}</strong> item{data.totalUncosted !== 1 ? "s" : ""} still need a cost estimate
            </p>
          </div>
        )}

        {/* Empty state */}
        {data.totalItems === 0 && (
          <div className="text-center py-2">
            <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              Add items to the Master Itinerary to track costs
            </p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Budget Breakdown
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1 pt-2">
            {/* Summary bar */}
            <div className="bg-muted/50 rounded-xl p-4 mb-4">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className={`text-3xl font-bold ${statusColor}`}>{fmt(data.grandTotal)}</span>
                  {effectiveBudgetMax && (
                    <span className="text-base text-muted-foreground ml-2">of {fmt(effectiveBudgetMax)}</span>
                  )}
                </div>
                {data.remaining !== null && effectiveBudgetMax && (
                  <span className={`text-sm font-semibold ${statusColor}`}>
                    {data.isOverBudget ? `${fmt(Math.abs(data.remaining))} over` : `${fmt(data.remaining)} left`}
                  </span>
                )}
              </div>
              {effectiveBudgetMax && percent !== null && (
                <div className="w-full bg-background rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Per-category sections */}
            <p className="text-sm text-muted-foreground px-1 pb-1">
              Click any item to add or edit its cost estimate.
            </p>
            {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
              const items = itemsByCategory[cat] || [];
              const catData = data.categoryTotals[cat as keyof typeof data.categoryTotals];
              if (items.length === 0) return null;
              return (
                <CategorySection
                  key={cat}
                  category={cat}
                  items={items}
                  total={catData?.total ?? 0}
                  uncosted={catData?.uncosted ?? 0}
                  onSaved={handleSaved}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
