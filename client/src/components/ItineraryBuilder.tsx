import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
  ArrowRight,
  Inbox,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleItem {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  island: string | null;
  category: string;
  timeOfDay: string | null;
  priceRange: string | null;
  estimatedCost: number | null;
  url: string | null;
  scheduledDay: number | null;
  scheduledTime: string | null;
  dayLabel: string | null;
  sortOrder: number;
}

interface TripDay {
  dayNumber: number;
  date: string | null;
  label: string | null;
  island: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  activity:       { emoji: "🤿", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  lodging:        { emoji: "🏨", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  restaurant:     { emoji: "🍽️", color: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
  transportation: { emoji: "🚌", color: "text-purple-700",  bg: "bg-purple-50 border-purple-200" },
  note:           { emoji: "📝", color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
};

const TIME_SLOTS = [
  { value: "07:00", label: "7:00 AM — Early Morning" },
  { value: "08:00", label: "8:00 AM — Morning" },
  { value: "09:00", label: "9:00 AM — Morning" },
  { value: "10:00", label: "10:00 AM — Late Morning" },
  { value: "11:00", label: "11:00 AM — Late Morning" },
  { value: "12:00", label: "12:00 PM — Noon" },
  { value: "13:00", label: "1:00 PM — Afternoon" },
  { value: "14:00", label: "2:00 PM — Afternoon" },
  { value: "15:00", label: "3:00 PM — Afternoon" },
  { value: "16:00", label: "4:00 PM — Late Afternoon" },
  { value: "17:00", label: "5:00 PM — Evening" },
  { value: "18:00", label: "6:00 PM — Evening" },
  { value: "19:00", label: "7:00 PM — Evening" },
  { value: "20:00", label: "8:00 PM — Night" },
];

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onAssign,
  onUnschedule,
  isAssigning,
  days,
}: {
  item: ScheduleItem;
  onAssign: (itemId: number, day: number, time?: string) => void;
  onUnschedule: (itemId: number) => void;
  isAssigning: boolean;
  days: TripDay[];
}) {
  const [showAssign, setShowAssign] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.note;

  const handleAssign = () => {
    onAssign(item.id, selectedDay, selectedTime || undefined);
    setShowAssign(false);
  };

  return (
    <div className={`border rounded-xl p-3 ${cfg.bg} transition-all`}>
      {/* Header row */}
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0 mt-0.5">{cfg.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight">{item.title}</p>
          {item.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {item.location}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.scheduledTime && (
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(item.scheduledTime)}
              </span>
            )}
            {item.estimatedCost !== null && (
              <span className="text-xs text-emerald-700 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${item.estimatedCost.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {item.scheduledDay ? (
            <button
              onClick={() => onUnschedule(item.id)}
              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
              title="Remove from schedule"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowAssign(!showAssign)}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
              title="Add to a day"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Assign to day panel */}
      {showAssign && !item.scheduledDay && (
        <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Assign to day</p>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(parseInt(e.target.value))}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {days.map((day) => (
              <option key={day.dayNumber} value={day.dayNumber}>
                Day {day.dayNumber}{day.date ? ` — ${formatDate(day.date)}` : ""}
                {day.island ? ` (${day.island})` : ""}
                {day.label ? ` · ${day.label}` : ""}
              </option>
            ))}
          </select>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">No specific time</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={isAssigning}
              className="flex-1 h-8 text-xs"
            >
              {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Add to Day {selectedDay}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAssign(false)}
              className="h-8 text-xs px-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

function DayColumn({
  day,
  items,
  onAssign,
  onUnschedule,
  onLabelChange,
  isAssigning,
  allDays,
}: {
  day: TripDay;
  items: ScheduleItem[];
  onAssign: (itemId: number, day: number, time?: string) => void;
  onUnschedule: (itemId: number) => void;
  onLabelChange: (dayNumber: number, label: string) => void;
  isAssigning: boolean;
  allDays: TripDay[];
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(day.label || "");

  const sortedItems = [...items].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    return a.sortOrder - b.sortOrder;
  });

  const dayTotal = items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);

  const handleLabelSave = () => {
    onLabelChange(day.dayNumber, labelDraft);
    setEditingLabel(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex-shrink-0 w-72">
      {/* Day header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {day.dayNumber}
            </div>
            {day.date && (
              <span className="text-sm font-semibold text-foreground">{formatDate(day.date)}</span>
            )}
          </div>
          {day.island && (
            <Badge variant="secondary" className="text-xs">
              🌺 {day.island}
            </Badge>
          )}
        </div>

        {/* Custom day label */}
        {editingLabel ? (
          <div className="flex gap-1 mt-1">
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLabelSave(); if (e.key === "Escape") setEditingLabel(false); }}
              placeholder="e.g. North Shore Day"
              className="flex-1 text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button onClick={handleLabelSave} className="p-1 rounded hover:bg-emerald-100 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditingLabel(false)} className="p-1 rounded hover:bg-red-100 text-red-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => { setLabelDraft(day.label || ""); setEditingLabel(true); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 group"
          >
            <span>{day.label || "Add a day title…"}</span>
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Day cost summary */}
        {dayTotal > 0 && (
          <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Est. ${dayTotal.toLocaleString()} this day
          </p>
        )}
      </div>

      {/* Items */}
      <div className="p-3 space-y-2 min-h-[120px]">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="text-2xl mb-1">📅</div>
            <p className="text-xs text-muted-foreground">No items yet</p>
            <p className="text-xs text-muted-foreground">Assign items from the pool below</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAssign={onAssign}
              onUnschedule={onUnschedule}
              isAssigning={isAssigning}
              days={allDays}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ItineraryBuilderProps {
  tripId: number;
}

export function ItineraryBuilder({ tripId }: ItineraryBuilderProps) {
  const utils = trpc.useUtils();
  const [visibleDayStart, setVisibleDayStart] = useState(0);
  const DAYS_VISIBLE = 3;

  const { data, isLoading } = trpc.schedule.getDays.useQuery(
    { tripId },
    { refetchInterval: false }
  );

  const assignMutation = trpc.schedule.assign.useMutation({
    onSuccess: () => {
      utils.schedule.getDays.invalidate({ tripId });
      toast.success("Item scheduled!");
    },
    onError: () => toast.error("Could not schedule item"),
  });

  const unscheduleMutation = trpc.schedule.unschedule.useMutation({
    onSuccess: () => {
      utils.schedule.getDays.invalidate({ tripId });
      toast.success("Item moved back to pool");
    },
    onError: () => toast.error("Could not unschedule item"),
  });

  const updateLabelMutation = trpc.schedule.updateDayLabel.useMutation({
    onSuccess: () => utils.schedule.getDays.invalidate({ tripId }),
  });

  const handleAssign = (itemId: number, day: number, time?: string) => {
    assignMutation.mutate({ itemId, tripId, scheduledDay: day, scheduledTime: time ?? null });
  };

  const handleUnschedule = (itemId: number) => {
    unscheduleMutation.mutate({ itemId, tripId });
  };

  const handleLabelChange = (dayNumber: number, label: string) => {
    updateLabelMutation.mutate({ tripId, dayNumber, label });
  };

  const days = data?.days ?? [];
  const allItems = data?.items ?? [];

  const unscheduledItems = useMemo(
    () => allItems.filter((i) => i.scheduledDay === null),
    [allItems]
  );

  const scheduledItems = useMemo(
    () => allItems.filter((i) => i.scheduledDay !== null),
    [allItems]
  );

  const itemsForDay = (dayNumber: number) =>
    scheduledItems.filter((i) => i.scheduledDay === dayNumber);

  const visibleDays = days.slice(visibleDayStart, visibleDayStart + DAYS_VISIBLE);
  const canGoBack = visibleDayStart > 0;
  const canGoForward = visibleDayStart + DAYS_VISIBLE < days.length;

  const grandTotal = scheduledItems.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasNoDates = days.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Day-by-Day Schedule
          </h2>
          <p className="text-muted-foreground mt-0.5">
            Assign activities, lodging, and dining to specific days
          </p>
        </div>
        {grandTotal > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Total scheduled: ${grandTotal.toLocaleString()}
          </div>
        )}
      </div>

      {/* No dates warning */}
      {hasNoDates && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">📅</div>
          <h3 className="font-semibold text-foreground mb-1">No trip dates set yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Chat with Leilani to set your travel dates first. Once dates are confirmed, your day columns will appear here automatically.
          </p>
        </div>
      )}

      {/* Day columns */}
      {!hasNoDates && (
        <div className="space-y-3">
          {/* Navigation controls */}
          {days.length > DAYS_VISIBLE && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleDayStart(Math.max(0, visibleDayStart - DAYS_VISIBLE))}
                disabled={!canGoBack}
                className="gap-1 h-9"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous days
              </Button>
              <span className="text-sm text-muted-foreground">
                Days {visibleDayStart + 1}–{Math.min(visibleDayStart + DAYS_VISIBLE, days.length)} of {days.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleDayStart(Math.min(days.length - DAYS_VISIBLE, visibleDayStart + DAYS_VISIBLE))}
                disabled={!canGoForward}
                className="gap-1 h-9"
              >
                Next days
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Day columns scroll area */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {visibleDays.map((day) => (
              <DayColumn
                key={day.dayNumber}
                day={day}
                items={itemsForDay(day.dayNumber)}
                onAssign={handleAssign}
                onUnschedule={handleUnschedule}
                onLabelChange={handleLabelChange}
                isAssigning={assignMutation.isPending}
                allDays={days}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled items pool */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Unscheduled Items</h3>
            {unscheduledItems.length > 0 && (
              <Badge variant="secondary">{unscheduledItems.length}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {unscheduledItems.length === 0
              ? "All items are scheduled! 🎉"
              : "Click → to assign each item to a day"}
          </p>
        </div>
        <div className="p-4">
          {unscheduledItems.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm text-muted-foreground">
                {allItems.length === 0
                  ? "Add items to the Master Itinerary first, then schedule them here."
                  : "All items have been scheduled — your trip is fully planned!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unscheduledItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onAssign={handleAssign}
                  onUnschedule={handleUnschedule}
                  isAssigning={assignMutation.isPending}
                  days={days}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {allItems.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{scheduledItems.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Scheduled</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{unscheduledItems.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Unscheduled</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{days.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Trip Days</p>
          </div>
        </div>
      )}
    </div>
  );
}
