import { useEffect, useMemo, useState } from "react";
import { CloudSun, Droplets, Loader2, RefreshCw, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const SUPPORTED_ISLANDS = ["Oahu", "Big Island", "Maui", "Kauai"];

const TONE_STYLES: Record<string, string> = {
  sunny: "border-amber-200 bg-amber-50/70",
  cloudy: "border-slate-200 bg-slate-50/80",
  rainy: "border-sky-200 bg-sky-50/80",
  stormy: "border-violet-200 bg-violet-50/80",
};

function formatForecastDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Pacific/Honolulu",
  });
}

interface WeatherForecastProps {
  tripId: number;
  islands: string[];
}

export function WeatherForecast({ tripId, islands }: WeatherForecastProps) {
  const availableIslands = useMemo(() => {
    const selected = islands.filter((island) => SUPPORTED_ISLANDS.includes(island));
    return selected.length > 0 ? selected : ["Oahu", "Big Island"];
  }, [islands]);
  const [selectedIsland, setSelectedIsland] = useState(availableIslands[0]);

  useEffect(() => {
    if (!availableIslands.includes(selectedIsland)) setSelectedIsland(availableIslands[0]);
  }, [availableIslands, selectedIsland]);

  const { data: forecast, isLoading, isFetching, isError, refetch } = trpc.weather.forecast.useQuery(
    { tripId, island: selectedIsland },
    { enabled: !!tripId && !!selectedIsland, staleTime: 10 * 60 * 1000 }
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CloudSun className="w-7 h-7 text-amber-500" />
            7-Day Island Weather
          </h2>
          <p className="text-lg text-muted-foreground mt-1">
            A simple daily forecast to help you plan outdoor activities and backup options.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-12 min-w-[132px] text-base shrink-0"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Choose island for forecast">
        {availableIslands.map((island) => (
          <Button
            key={island}
            type="button"
            variant={selectedIsland === island ? "default" : "outline"}
            onClick={() => setSelectedIsland(island)}
            className="h-12 px-5 text-base"
          >
            {island}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="min-h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-lg">Loading the {selectedIsland} forecast…</p>
        </div>
      ) : isError || !forecast ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-lg font-semibold text-foreground">Weather is temporarily unavailable.</p>
          <p className="text-muted-foreground mt-1">Please try refreshing in a moment.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-lg text-foreground">
              <strong>{forecast.island}</strong> forecast, shown in {forecast.timezone.replace("_", " ")} time.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Forecasts can change. Check again close to an outing, especially for ocean, hiking, or boat plans.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
            {forecast.days.map((day) => (
              <article
                key={day.date}
                className={`rounded-2xl border p-4 min-h-[250px] flex flex-col ${TONE_STYLES[day.tone] ?? TONE_STYLES.cloudy}`}
              >
                <p className="text-base font-bold text-foreground">{formatForecastDate(day.date)}</p>
                <div className="text-4xl leading-none mt-3" aria-hidden="true">{day.icon}</div>
                <p className="text-lg font-semibold text-foreground mt-3">{day.condition}</p>
                <p className="text-xl font-bold text-foreground mt-2">
                  {day.highF}° <span className="text-base font-medium text-muted-foreground">/ {day.lowF}°</span>
                </p>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-sky-600" /> {day.rainChance}% rain</p>
                  <p className="flex items-center gap-1.5"><Wind className="w-4 h-4 text-slate-600" /> Wind up to {day.maxWindMph} mph</p>
                </div>
                <p className="mt-auto pt-3 text-sm leading-5 text-foreground/80">{day.guidance}</p>
              </article>
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Forecast data provided by <a className="underline hover:text-primary" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>.
          </p>
        </>
      )}
    </section>
  );
}
