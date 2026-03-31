import { CheckCircle2, Circle, Clock } from "lucide-react";

const STAGES = [
  { key: "welcome", label: "Welcome", icon: "👋" },
  { key: "dates", label: "Dates", icon: "📅" },
  { key: "islands", label: "Islands", icon: "🏝️" },
  { key: "budget", label: "Budget", icon: "💰" },
  { key: "activities", label: "Activities", icon: "🤿" },
  { key: "lodging", label: "Lodging", icon: "🏨" },
  { key: "transportation", label: "Transport", icon: "✈️" },
  { key: "summary", label: "Summary", icon: "📋" },
] as const;

type Stage = (typeof STAGES)[number]["key"];

interface PlanningProgressProps {
  currentStage: Stage;
  compact?: boolean;
}

export function PlanningProgress({ currentStage, compact = false }: PlanningProgressProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {STAGES.map((stage, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div
              key={stage.key}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                isCurrent
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : isComplete
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              title={stage.label}
            >
              <span>{stage.icon}</span>
              {isCurrent && <span>{stage.label}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Planning Progress
        </h3>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {STAGES.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${((currentIndex) / (STAGES.length - 1)) * 100}%`,
            background: "linear-gradient(90deg, oklch(0.42 0.12 195), oklch(0.72 0.14 35))",
          }}
        />
      </div>

      {/* Stage list */}
      <div className="space-y-1.5">
        {STAGES.map((stage, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isPending = i > currentIndex;

          return (
            <div
              key={stage.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isCurrent
                  ? "bg-accent/15 border border-accent/30"
                  : isComplete
                  ? "opacity-70"
                  : "opacity-40"
              }`}
            >
              <span className="text-lg w-6 text-center">{stage.icon}</span>
              <span
                className={`text-sm font-medium flex-1 ${
                  isCurrent ? "text-accent-foreground" : isComplete ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </span>
              {isComplete && <CheckCircle2 className="w-4 h-4 text-primary" />}
              {isCurrent && <Clock className="w-4 h-4 text-accent" />}
              {isPending && <Circle className="w-4 h-4 text-muted-foreground/40" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
