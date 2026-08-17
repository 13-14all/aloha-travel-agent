export type WeatherTone = "sunny" | "cloudy" | "rainy" | "stormy";

export type IslandLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

export type DailyForecast = {
  date: string;
  weatherCode: number;
  condition: string;
  icon: string;
  tone: WeatherTone;
  highF: number;
  lowF: number;
  rainChance: number;
  maxWindMph: number;
  guidance: string;
};

export type IslandForecast = {
  island: string;
  location: IslandLocation;
  timezone: string;
  generatedAt: string;
  days: DailyForecast[];
};

const WEATHER_LOCATIONS: Record<string, IslandLocation> = {
  Oahu: { name: "Oahu", latitude: 21.4389, longitude: -158.0001 },
  "Big Island": { name: "Big Island", latitude: 19.5429, longitude: -155.6659 },
  Maui: { name: "Maui", latitude: 20.7984, longitude: -156.3319 },
  Kauai: { name: "Kauai", latitude: 22.0964, longitude: -159.5261 },
};

const FORECAST_CACHE_MS = 10 * 60 * 1000;
const forecastCache = new Map<string, { expiresAt: number; forecast: IslandForecast }>();

type OpenMeteoResponse = {
  timezone?: string;
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
  };
};

export function getSupportedWeatherIslands(): string[] {
  return Object.keys(WEATHER_LOCATIONS);
}

export function getWeatherLocation(island: string): IslandLocation | undefined {
  const normalized = island.trim().toLowerCase();
  return Object.values(WEATHER_LOCATIONS).find(
    (location) => location.name.toLowerCase() === normalized
  );
}

export function describeWeatherCode(code: number): Pick<DailyForecast, "condition" | "icon" | "tone"> {
  if (code === 0) return { condition: "Clear skies", icon: "☀️", tone: "sunny" };
  if ([1, 2].includes(code)) return { condition: "Mostly clear", icon: "🌤️", tone: "sunny" };
  if (code === 3) return { condition: "Overcast", icon: "☁️", tone: "cloudy" };
  if ([45, 48].includes(code)) return { condition: "Foggy", icon: "🌫️", tone: "cloudy" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Light drizzle", icon: "🌦️", tone: "rainy" };
  if ([61, 63, 65, 66, 67].includes(code)) return { condition: "Rain", icon: "🌧️", tone: "rainy" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snow showers", icon: "❄️", tone: "cloudy" };
  if ([80, 81, 82].includes(code)) return { condition: "Rain showers", icon: "🌦️", tone: "rainy" };
  if ([95, 96, 99].includes(code)) return { condition: "Thunderstorms", icon: "⛈️", tone: "stormy" };
  return { condition: "Changing conditions", icon: "🌤️", tone: "cloudy" };
}

export function createTravelGuidance(weatherCode: number, rainChance: number, maxWindMph: number): string {
  if ([95, 96, 99].includes(weatherCode)) {
    return "Plan an indoor backup and check local alerts before heading out.";
  }
  if (rainChance >= 60) {
    return "Keep a flexible plan and pack a light rain layer.";
  }
  if (maxWindMph >= 30) {
    return "Breezy conditions possible—confirm ocean and boat plans first.";
  }
  if ([0, 1, 2].includes(weatherCode)) {
    return "A good day for outdoor sightseeing; bring water and sun protection.";
  }
  return "A comfortable day for flexible island exploring.";
}

export async function getIslandForecast(island: string): Promise<IslandForecast> {
  const location = getWeatherLocation(island);
  if (!location) {
    throw new Error(`Weather forecasts are not yet configured for ${island}.`);
  }

  const cached = forecastCache.get(location.name);
  if (cached && cached.expiresAt > Date.now()) return cached.forecast;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"
  );
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "Pacific/Honolulu");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Weather service is temporarily unavailable (${response.status}).`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const daily = data.daily;
  const dates = daily?.time ?? [];
  if (
    dates.length === 0 ||
    !daily?.weather_code ||
    !daily.temperature_2m_max ||
    !daily.temperature_2m_min ||
    !daily.precipitation_probability_max ||
    !daily.wind_speed_10m_max
  ) {
    throw new Error("Weather service returned an incomplete forecast.");
  }

  const forecast: IslandForecast = {
    island: location.name,
    location,
    timezone: data.timezone ?? "Pacific/Honolulu",
    generatedAt: new Date().toISOString(),
    days: dates.slice(0, 7).map((date, index) => {
      const weatherCode = daily.weather_code![index] ?? 0;
      const rainChance = Math.round(daily.precipitation_probability_max![index] ?? 0);
      const maxWindMph = Math.round(daily.wind_speed_10m_max![index] ?? 0);
      const description = describeWeatherCode(weatherCode);
      return {
        date,
        weatherCode,
        ...description,
        highF: Math.round(daily.temperature_2m_max![index] ?? 0),
        lowF: Math.round(daily.temperature_2m_min![index] ?? 0),
        rainChance,
        maxWindMph,
        guidance: createTravelGuidance(weatherCode, rainChance, maxWindMph),
      };
    }),
  };

  forecastCache.set(location.name, { forecast, expiresAt: Date.now() + FORECAST_CACHE_MS });
  return forecast;
}
