import { Calendar, MapPin, DollarSign, Users, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Trip } from "../../../drizzle/schema";

interface TripSummaryCardProps {
  trip: Trip;
  onEdit?: () => void;
}

export function TripSummaryCard({ trip, onEdit }: TripSummaryCardProps) {
  const islands = (trip.islands as string[]) || [];
  const budgetStr =
    trip.budgetMin && trip.budgetMax
      ? `$${trip.budgetMin.toLocaleString()} – $${trip.budgetMax.toLocaleString()}`
      : null;

  const details = [
    {
      icon: <Calendar className="w-4 h-4 text-primary" />,
      label: "Travel Dates",
      value:
        trip.startDate && trip.endDate
          ? `${trip.startDate} – ${trip.endDate}`
          : null,
      placeholder: "Not set yet",
    },
    {
      icon: <MapPin className="w-4 h-4 text-primary" />,
      label: "Islands",
      value: islands.length > 0 ? islands.join(", ") : null,
      placeholder: "Not selected yet",
    },
    {
      icon: <DollarSign className="w-4 h-4 text-primary" />,
      label: "Budget",
      value: budgetStr,
      placeholder: "Not set yet",
    },
    {
      icon: <Users className="w-4 h-4 text-primary" />,
      label: "Travelers",
      value: `${trip.guestCount || 2} people`,
      placeholder: null,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Trip Details
        </h3>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {details.map((detail) => (
          <div key={detail.label} className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">{detail.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{detail.label}</p>
              <p
                className={`text-sm font-medium leading-tight ${
                  detail.value ? "text-foreground" : "text-muted-foreground/50 italic"
                }`}
              >
                {detail.value || detail.placeholder}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Island badges */}
      {islands.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
          {islands.map((island) => (
            <span
              key={island}
              className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 font-medium"
            >
              🏝️ {island}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
