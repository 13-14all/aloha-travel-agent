import { MapPin, Calendar, Users, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mascot } from "./Mascot";
import type { Trip } from "../../../drizzle/schema";

const STAGE_LABELS: Record<string, string> = {
  welcome: "Just Starting",
  dates: "Setting Dates",
  islands: "Choosing Islands",
  budget: "Setting Budget",
  activities: "Finding Activities",
  lodging: "Finding Lodging",
  transportation: "Planning Transport",
  summary: "Plan Complete",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-accent/20 text-accent-foreground border-accent/30",
  booked: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-green-100 text-green-800 border-green-200",
  archived: "bg-muted text-muted-foreground border-border",
};

interface TripCardProps {
  trip: Trip;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TripCard({ trip, onOpen, onDelete }: TripCardProps) {
  const islands = (trip.islands as string[]) || [];

  return (
    <div
      className="result-card bg-card border border-border rounded-2xl p-5 flex gap-4 group"
      onClick={() => onOpen(trip.id)}
    >
      {/* Mascot */}
      <div className="shrink-0">
        <Mascot mascotType={trip.mascotType} size="sm" animated={false} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-foreground leading-tight truncate">
            {trip.title}
          </h3>
          <span
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[trip.status]}`}
          >
            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {trip.destination}
          </span>
          {trip.startDate && trip.endDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {trip.startDate} – {trip.endDate}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {trip.guestCount || 2} travelers
          </span>
        </div>

        {islands.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {islands.map((island) => (
              <span
                key={island}
                className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 font-medium"
              >
                {island}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Stage: <span className="font-medium text-foreground">{STAGE_LABELS[trip.planningStage]}</span>
          </span>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(trip.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-primary hover:text-primary hover:bg-primary/10"
            >
              Open <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
