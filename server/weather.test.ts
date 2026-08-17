import { describe, expect, it } from "vitest";
import {
  createTravelGuidance,
  describeWeatherCode,
  getSupportedWeatherIslands,
  getWeatherLocation,
} from "./weather";

describe("weather helpers", () => {
  it("supports the Hawaii islands used by current and future trip templates", () => {
    expect(getSupportedWeatherIslands()).toEqual(expect.arrayContaining(["Oahu", "Big Island", "Maui", "Kauai"]));
    expect(getWeatherLocation("oahu")?.latitude).toBeCloseTo(21.4389, 4);
    expect(getWeatherLocation("Big Island")?.longitude).toBeCloseTo(-155.6659, 4);
    expect(getWeatherLocation("Unknown Island")).toBeUndefined();
  });

  it("converts WMO weather codes into plain-language labels for travelers", () => {
    expect(describeWeatherCode(0)).toMatchObject({ condition: "Clear skies", icon: "☀️", tone: "sunny" });
    expect(describeWeatherCode(63)).toMatchObject({ condition: "Rain", tone: "rainy" });
    expect(describeWeatherCode(95)).toMatchObject({ condition: "Thunderstorms", tone: "stormy" });
  });

  it("prioritizes safety-focused advice for storms, rain, and strong winds", () => {
    expect(createTravelGuidance(95, 20, 10)).toContain("indoor backup");
    expect(createTravelGuidance(61, 70, 10)).toContain("rain layer");
    expect(createTravelGuidance(2, 10, 35)).toContain("ocean and boat plans");
    expect(createTravelGuidance(0, 0, 8)).toContain("sun protection");
  });
});
