import { useEffect, useRef, useState, useCallback } from "react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, RefreshCw } from "lucide-react";

// ─── Island Center Coordinates ────────────────────────────────────────────────

const ISLAND_CENTERS: Record<string, { lat: number; lng: number; zoom: number; label: string }> = {
  "Oahu":        { lat: 21.4389,  lng: -158.0001, zoom: 11, label: "Oahu" },
  "Big Island":  { lat: 19.5429,  lng: -155.6659, zoom: 9,  label: "Big Island" },
  "Maui":        { lat: 20.7984,  lng: -156.3319, zoom: 10, label: "Maui" },
  "Kauai":       { lat: 22.0964,  lng: -159.5261, zoom: 11, label: "Kauai" },
  "Molokai":     { lat: 21.1444,  lng: -157.0228, zoom: 11, label: "Molokai" },
  "Lanai":       { lat: 20.8270,  lng: -156.9200, zoom: 12, label: "Lanai" },
  // Fallback: center of Hawaii archipelago
  "Hawaii":      { lat: 20.5,     lng: -157.5,    zoom: 7,  label: "Hawaii" },
};

// ─── Category Marker Colors ───────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; border: string; emoji: string; label: string }> = {
  activity:       { bg: "#10b981", border: "#059669", emoji: "🤿", label: "Activities" },
  lodging:        { bg: "#3b82f6", border: "#2563eb", emoji: "🏨", label: "Lodging" },
  restaurant:     { bg: "#f97316", border: "#ea580c", emoji: "🍽️", label: "Dining" },
  transportation: { bg: "#8b5cf6", border: "#7c3aed", emoji: "🚌", label: "Transport" },
  note:           { bg: "#6b7280", border: "#4b5563", emoji: "📝", label: "Notes" },
};

// ─── Map Item Type ────────────────────────────────────────────────────────────

interface MapItem {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  island: string | null;
  category: string;
  url: string | null;
  priceRange: string | null;
  timeOfDay: string | null;
}

// ─── Create Custom Marker Element ─────────────────────────────────────────────

function createMarkerElement(category: string, title: string): HTMLElement {
  const cfg = CATEGORY_COLORS[category] || CATEGORY_COLORS.note;
  const el = document.createElement("div");
  el.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  `;
  el.innerHTML = `
    <div style="
      background: ${cfg.bg};
      border: 2.5px solid ${cfg.border};
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: transform 0.15s ease;
    " title="${title.replace(/"/g, '&quot;')}">${cfg.emoji}</div>
    <div style="
      width: 0; height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 7px solid ${cfg.border};
      margin-top: -1px;
    "></div>
  `;
  return el;
}

// ─── Info Window Content ──────────────────────────────────────────────────────

function createInfoWindowContent(item: MapItem): string {
  const cfg = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.note;
  return `
    <div style="max-width: 240px; font-family: system-ui, sans-serif; padding: 4px 0;">
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
        <span style="font-size:18px;">${cfg.emoji}</span>
        <strong style="font-size:14px; color:#111;">${item.title}</strong>
      </div>
      ${item.location ? `<p style="font-size:12px; color:#666; margin:0 0 4px; display:flex; align-items:center; gap:4px;">📍 ${item.location}</p>` : ""}
      ${item.description ? `<p style="font-size:12px; color:#444; margin:0 0 6px; line-height:1.4;">${item.description.slice(0, 120)}${item.description.length > 120 ? "…" : ""}</p>` : ""}
      ${item.priceRange ? `<p style="font-size:12px; color:#059669; margin:0 0 4px; font-weight:600;">💰 ${item.priceRange}</p>` : ""}
      ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" style="font-size:12px; color:#2563eb; text-decoration:underline;">View details →</a>` : ""}
    </div>
  `;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface IslandMapViewProps {
  tripId: number;
  islands?: string[];
}

export function IslandMapView({ tripId, islands = [] }: IslandMapViewProps) {
  const [selectedIsland, setSelectedIsland] = useState<string>(islands[0] || "Hawaii");
  const [geocodingStatus, setGeocodingStatus] = useState<"idle" | "loading" | "done">("idle");
  const [geocodedCount, setGeocodedCount] = useState(0);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const { data: mapItems = [], isLoading, refetch } = trpc.map.items.useQuery(
    { tripId, island: selectedIsland !== "All" ? selectedIsland : undefined },
    { refetchInterval: false }
  );

  // Clear all existing markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  // Geocode and place markers for all items
  const placeMarkers = useCallback(
    async (map: google.maps.Map, items: MapItem[]) => {
      clearMarkers();
      if (items.length === 0) return;

      setGeocodingStatus("loading");
      setGeocodedCount(0);

      const geocoder = new window.google.maps.Geocoder();
      const bounds = new window.google.maps.LatLngBounds();
      const infoWindow = new window.google.maps.InfoWindow();
      infoWindowRef.current = infoWindow;

      let placed = 0;

      for (const item of items) {
        const searchQuery = item.location
          ? `${item.location}, ${item.island || selectedIsland}, Hawaii`
          : `${item.title}, ${item.island || selectedIsland}, Hawaii`;

        try {
          await new Promise<void>((resolve) => {
            geocoder.geocode({ address: searchQuery }, (results, status) => {
              if (status === "OK" && results && results[0]) {
                const position = results[0].geometry.location;
                bounds.extend(position);

                const markerEl = createMarkerElement(item.category, item.title);
                const marker = new window.google.maps.marker.AdvancedMarkerElement({
                  map,
                  position,
                  title: item.title,
                  content: markerEl,
                });

                marker.addListener("click", () => {
                  infoWindow.setContent(createInfoWindowContent(item));
                  infoWindow.open({ anchor: marker, map });
                });

                markersRef.current.push(marker);
                placed++;
                setGeocodedCount(placed);
              }
              resolve();
            });
          });
          // Small delay to avoid hitting geocoding rate limits
          await new Promise((r) => setTimeout(r, 100));
        } catch {
          // Skip items that fail to geocode
        }
      }

      // Fit map to show all markers
      if (placed > 0 && !bounds.isEmpty()) {
        map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
        // Don't zoom in too far for single markers
        const listener = window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom()! > 14) map.setZoom(14);
        });
      }

      setGeocodingStatus("done");
    },
    [selectedIsland, clearMarkers]
  );

  // When map is ready, place markers
  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (mapItems.length > 0) {
        placeMarkers(map, mapItems);
      }
    },
    [mapItems, placeMarkers]
  );

  // Re-place markers when items change
  useEffect(() => {
    if (mapRef.current && mapItems.length > 0) {
      placeMarkers(mapRef.current, mapItems);
    } else if (mapRef.current && mapItems.length === 0) {
      clearMarkers();
      setGeocodingStatus("idle");
    }
  }, [mapItems, placeMarkers, clearMarkers]);

  // Pan to selected island when it changes
  useEffect(() => {
    if (mapRef.current) {
      const center = ISLAND_CENTERS[selectedIsland] || ISLAND_CENTERS["Hawaii"];
      mapRef.current.panTo({ lat: center.lat, lng: center.lng });
      mapRef.current.setZoom(center.zoom);
    }
  }, [selectedIsland]);

  const islandCenter = ISLAND_CENTERS[selectedIsland] || ISLAND_CENTERS["Hawaii"];

  // Build island list — use trip islands if provided, else show all
  const islandList = islands.length > 0 ? islands : Object.keys(ISLAND_CENTERS).filter((k) => k !== "Hawaii");

  // Category counts for the legend
  const categoryCounts = mapItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            Island Map
          </h2>
          <p className="text-muted-foreground mt-0.5">
            See all your saved places plotted on the map
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 h-9"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Island selector */}
      {islandList.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {islandList.map((island) => (
            <button
              key={island}
              onClick={() => setSelectedIsland(island)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                selectedIsland === island
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {island}
            </button>
          ))}
        </div>
      )}

      {/* Category legend */}
      {mapItems.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(CATEGORY_COLORS).map(([cat, cfg]) => {
            const count = categoryCounts[cat] || 0;
            if (count === 0) return null;
            return (
              <div
                key={cat}
                className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1"
              >
                <span className="text-sm">{cfg.emoji}</span>
                <span className="text-xs font-medium text-foreground">{cfg.label}</span>
                <Badge variant="secondary" className="text-xs h-4 px-1.5 ml-0.5">
                  {count}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Geocoding status */}
      {geocodingStatus === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Placing {geocodedCount} of {mapItems.length} locations on the map…
        </div>
      )}
      {geocodingStatus === "done" && geocodedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4" />
          {geocodedCount} location{geocodedCount !== 1 ? "s" : ""} plotted — click any marker for details
        </div>
      )}

      {/* Empty state */}
      {!isLoading && mapItems.length === 0 && (
        <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No places to show yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Add activities, lodging, and restaurants to the Master Itinerary and they will appear here as map markers.
          </p>
        </div>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <MapView
          key={selectedIsland}
          initialCenter={{ lat: islandCenter.lat, lng: islandCenter.lng }}
          initialZoom={islandCenter.zoom}
          onMapReady={handleMapReady}
          className="w-full h-[520px]"
        />
      </div>

      {/* Tips */}
      <p className="text-xs text-muted-foreground text-center">
        Tip: Click any marker to see details. Use the island buttons above to switch views.
      </p>
    </div>
  );
}
