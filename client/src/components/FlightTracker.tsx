import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Plus,
  Trash2,
  Pencil,
  Clock,
  MapPin,
  Hash,
  CreditCard,
  ChevronRight,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type FlightLeg = "outbound" | "return" | "inter_island" | "other";

interface Flight {
  id: number;
  tripId: number;
  leg: FlightLeg;
  airline: string | null;
  flightNumber: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  date: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  confirmationCode: string | null;
  seatInfo: string | null;
  price: string | null;
  notes: string | null;
}

// ─── Leg Config ───────────────────────────────────────────────────────────────

const LEG_CONFIG: Record<FlightLeg, { label: string; color: string; bg: string; emoji: string }> = {
  outbound:     { label: "Outbound",      color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   emoji: "✈️" },
  return:       { label: "Return",        color: "text-purple-700", bg: "bg-purple-50 border-purple-200", emoji: "🏠" },
  inter_island: { label: "Inter-Island",  color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200", emoji: "🌺" },
  other:        { label: "Other",         color: "text-gray-700",   bg: "bg-gray-50 border-gray-200",   emoji: "🛫" },
};

// ─── Empty Form State ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  leg: "outbound" as FlightLeg,
  airline: "",
  flightNumber: "",
  departureAirport: "",
  arrivalAirport: "",
  departureCity: "",
  arrivalCity: "",
  date: "",
  departureTime: "",
  arrivalTime: "",
  confirmationCode: "",
  seatInfo: "",
  price: "",
  notes: "",
};

// ─── Flight Form Dialog ───────────────────────────────────────────────────────

function FlightFormDialog({
  tripId,
  open,
  onClose,
  editFlight,
}: {
  tripId: number;
  open: boolean;
  onClose: () => void;
  editFlight?: Flight | null;
}) {
  const [form, setForm] = useState(() =>
    editFlight
      ? {
          leg: editFlight.leg,
          airline: editFlight.airline ?? "",
          flightNumber: editFlight.flightNumber ?? "",
          departureAirport: editFlight.departureAirport ?? "",
          arrivalAirport: editFlight.arrivalAirport ?? "",
          departureCity: editFlight.departureCity ?? "",
          arrivalCity: editFlight.arrivalCity ?? "",
          date: editFlight.date ?? "",
          departureTime: editFlight.departureTime ?? "",
          arrivalTime: editFlight.arrivalTime ?? "",
          confirmationCode: editFlight.confirmationCode ?? "",
          seatInfo: editFlight.seatInfo ?? "",
          price: editFlight.price ?? "",
          notes: editFlight.notes ?? "",
        }
      : EMPTY_FORM
  );

  const utils = trpc.useUtils();

  const addFlight = trpc.flights.add.useMutation({
    onSuccess: () => {
      utils.flights.list.invalidate({ tripId });
      toast.success("Flight added!");
      onClose();
    },
    onError: () => toast.error("Failed to add flight"),
  });

  const updateFlight = trpc.flights.update.useMutation({
    onSuccess: () => {
      utils.flights.list.invalidate({ tripId });
      toast.success("Flight updated!");
      onClose();
    },
    onError: () => toast.error("Failed to update flight"),
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    const payload = {
      tripId,
      leg: form.leg,
      airline: form.airline || undefined,
      flightNumber: form.flightNumber || undefined,
      departureAirport: form.departureAirport.toUpperCase() || undefined,
      arrivalAirport: form.arrivalAirport.toUpperCase() || undefined,
      departureCity: form.departureCity || undefined,
      arrivalCity: form.arrivalCity || undefined,
      date: form.date || undefined,
      departureTime: form.departureTime || undefined,
      arrivalTime: form.arrivalTime || undefined,
      confirmationCode: form.confirmationCode || undefined,
      seatInfo: form.seatInfo || undefined,
      price: form.price ? parseFloat(form.price) : undefined,
      notes: form.notes || undefined,
    };

    if (editFlight) {
      updateFlight.mutate({ id: editFlight.id, ...payload });
    } else {
      addFlight.mutate(payload);
    }
  };

  const isPending = addFlight.isPending || updateFlight.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            {editFlight ? "Edit Flight" : "Add Flight"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Leg type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Flight Type</Label>
            <Select value={form.leg} onValueChange={(v) => set("leg", v)}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEG_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{cfg.emoji}</span>
                      {cfg.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Airline + Flight Number */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Airline</Label>
              <Input
                value={form.airline}
                onChange={(e) => set("airline", e.target.value)}
                placeholder="Hawaiian Airlines"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Flight Number</Label>
              <Input
                value={form.flightNumber}
                onChange={(e) => set("flightNumber", e.target.value)}
                placeholder="HA 100"
                className="h-11 text-base"
              />
            </div>
          </div>

          {/* Route */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Route</Label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <div className="space-y-1">
                <Input
                  value={form.departureAirport}
                  onChange={(e) => set("departureAirport", e.target.value.toUpperCase())}
                  placeholder="DEN"
                  maxLength={4}
                  className="h-11 text-base font-mono text-center uppercase"
                />
                <Input
                  value={form.departureCity}
                  onChange={(e) => set("departureCity", e.target.value)}
                  placeholder="Denver"
                  className="h-9 text-sm"
                />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="space-y-1">
                <Input
                  value={form.arrivalAirport}
                  onChange={(e) => set("arrivalAirport", e.target.value.toUpperCase())}
                  placeholder="HNL"
                  maxLength={4}
                  className="h-11 text-base font-mono text-center uppercase"
                />
                <Input
                  value={form.arrivalCity}
                  onChange={(e) => set("arrivalCity", e.target.value)}
                  placeholder="Honolulu"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Departs</Label>
              <Input
                type="time"
                value={form.departureTime}
                onChange={(e) => set("departureTime", e.target.value)}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Arrives</Label>
              <Input
                type="time"
                value={form.arrivalTime}
                onChange={(e) => set("arrivalTime", e.target.value)}
                className="h-11 text-base"
              />
            </div>
          </div>

          {/* Confirmation + Seat + Price */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Confirmation</Label>
              <Input
                value={form.confirmationCode}
                onChange={(e) => set("confirmationCode", e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="h-11 text-base font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Seat / Class</Label>
              <Input
                value={form.seatInfo}
                onChange={(e) => set("seatInfo", e.target.value)}
                placeholder="14A / Economy"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Price ($)</Label>
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="450"
                className="h-11 text-base"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Window seat, checked bag included…"
              className="h-11 text-base"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="h-11 text-base">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="h-11 text-base px-6">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editFlight ? "Save Changes" : "Add Flight"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Flight Card ──────────────────────────────────────────────────────────────

function FlightCard({
  flight,
  onEdit,
  onDelete,
}: {
  flight: Flight;
  onEdit: (f: Flight) => void;
  onDelete: (id: number) => void;
}) {
  const cfg = LEG_CONFIG[flight.leg] || LEG_CONFIG.other;

  const formatTime = (t: string | null) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    try {
      return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className={`border rounded-2xl p-4 ${cfg.bg} transition-all hover:shadow-md`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>
                {cfg.label}
              </span>
              {flight.confirmationCode && (
                <Badge variant="outline" className="text-xs h-4 px-1.5 font-mono">
                  {flight.confirmationCode}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {flight.airline && <span>{flight.airline}</span>}
              {flight.flightNumber && <span className="ml-1 font-mono">· {flight.flightNumber}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(flight)}
            className="p-1.5 rounded-lg hover:bg-white/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit flight"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(flight.id)}
            className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
            title="Remove flight"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Route display */}
      <div className="flex items-center gap-2 mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold font-mono text-foreground">
            {flight.departureAirport || "???"}
          </p>
          {flight.departureCity && (
            <p className="text-xs text-muted-foreground truncate max-w-[80px]">{flight.departureCity}</p>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 w-full">
            <div className="flex-1 h-px bg-current opacity-30" />
            <Plane className="w-4 h-4 text-current opacity-60" />
            <div className="flex-1 h-px bg-current opacity-30" />
          </div>
          {flight.date && (
            <p className="text-xs text-muted-foreground">{formatDate(flight.date)}</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold font-mono text-foreground">
            {flight.arrivalAirport || "???"}
          </p>
          {flight.arrivalCity && (
            <p className="text-xs text-muted-foreground truncate max-w-[80px]">{flight.arrivalCity}</p>
          )}
        </div>
      </div>

      {/* Times + extras */}
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {(flight.departureTime || flight.arrivalTime) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {formatTime(flight.departureTime)}
                {flight.arrivalTime && (
                  <>
                    <ChevronRight className="w-3 h-3 inline mx-0.5" />
                    {formatTime(flight.arrivalTime)}
                  </>
                )}
              </span>
            </div>
          )}
          {flight.seatInfo && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Hash className="w-3 h-3" />
              <span className="text-xs">{flight.seatInfo}</span>
            </div>
          )}
        </div>
        {flight.price && (
          <div className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CreditCard className="w-3.5 h-3.5" />
            <span>${parseFloat(flight.price).toLocaleString()}</span>
          </div>
        )}
      </div>

      {flight.notes && (
        <p className="mt-2 text-xs text-muted-foreground italic border-t border-current/10 pt-2">
          {flight.notes}
        </p>
      )}
    </div>
  );
}

// ─── Main FlightTracker Component ─────────────────────────────────────────────

interface FlightTrackerProps {
  tripId: number;
}

export function FlightTracker({ tripId }: FlightTrackerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFlight, setEditFlight] = useState<Flight | null>(null);
  const utils = trpc.useUtils();

  const { data: flightList = [], isLoading } = trpc.flights.list.useQuery({ tripId });

  const removeFlight = trpc.flights.remove.useMutation({
    onSuccess: () => {
      utils.flights.list.invalidate({ tripId });
      toast.success("Flight removed");
    },
    onError: () => toast.error("Failed to remove flight"),
  });

  const handleEdit = (flight: Flight) => {
    setEditFlight(flight);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditFlight(null);
  };

  // Group flights by leg type for the timeline
  const legOrder: FlightLeg[] = ["outbound", "inter_island", "return", "other"];
  const grouped = legOrder.reduce<Record<FlightLeg, Flight[]>>(
    (acc, leg) => {
      acc[leg] = flightList.filter((f) => f.leg === leg) as Flight[];
      return acc;
    },
    { outbound: [], inter_island: [], return: [], other: [] }
  );

  // Calculate total flight cost
  const totalCost = flightList.reduce((sum, f) => {
    return sum + (f.price ? parseFloat(f.price) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-600" />
            Flights
          </h2>
          <p className="text-muted-foreground mt-0.5">
            Track all your flights — outbound, inter-island, and return
          </p>
        </div>
        <Button
          onClick={() => { setEditFlight(null); setDialogOpen(true); }}
          className="h-11 text-base gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Flight
        </Button>
      </div>

      {/* Cost summary bar */}
      {flightList.length > 0 && totalCost > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm font-semibold">Total Flight Cost</span>
          </div>
          <span className="text-lg font-bold text-blue-700">
            ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && flightList.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <div className="text-5xl mb-4">✈️</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No flights yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Add your outbound flight, inter-island hops, and return flight to keep everything in one place.
          </p>
          <Button
            onClick={() => { setEditFlight(null); setDialogOpen(true); }}
            className="h-11 text-base gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Your First Flight
          </Button>
        </div>
      )}

      {/* Flight timeline by leg group */}
      {!isLoading && flightList.length > 0 && (
        <div className="space-y-6">
          {legOrder.map((leg) => {
            const legFlights = grouped[leg];
            if (legFlights.length === 0) return null;
            const cfg = LEG_CONFIG[leg];
            return (
              <div key={leg}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{cfg.emoji}</span>
                  <h3 className={`text-base font-bold ${cfg.color}`}>{cfg.label} Flights</h3>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {legFlights.map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      onEdit={handleEdit}
                      onDelete={(id) => removeFlight.mutate({ id })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <FlightFormDialog
        tripId={tripId}
        open={dialogOpen}
        onClose={handleClose}
        editFlight={editFlight}
      />
    </div>
  );
}
