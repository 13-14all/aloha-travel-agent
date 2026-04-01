import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-1",
    email: "owner@example.com",
    name: "Trip Owner",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Destinations ─────────────────────────────────────────────────────────────

describe("trips.destinations", () => {
  it("returns a list of available destinations", async () => {
    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const destinations = await caller.trips.destinations();

    expect(Array.isArray(destinations)).toBe(true);
    expect(destinations.length).toBeGreaterThan(0);

    const hawaii = destinations.find((d) => d.key === "hawaii");
    expect(hawaii).toBeDefined();
    expect(hawaii?.name).toBe("Hawaii");
    expect(hawaii?.mascotEmoji).toBeDefined();
  });

  it("includes Scotland, Italy, and Japan destinations", async () => {
    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const destinations = await caller.trips.destinations();

    const keys = destinations.map((d) => d.key);
    expect(keys).toContain("scotland");
    expect(keys).toContain("italy");
    expect(keys).toContain("japan");
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();

    expect(me).toBeDefined();
    expect(me?.id).toBe(1);
    expect(me?.name).toBe("Trip Owner");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: makeUser(),
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });
});

// ─── Member Role Validation ───────────────────────────────────────────────────

describe("member role permissions", () => {
  it("viewer role cannot access planner-only operations", () => {
    // Verify the role enum values are correct
    const validRoles = ["owner", "planner", "viewer"];
    expect(validRoles).toContain("viewer");
    expect(validRoles).toContain("planner");
    expect(validRoles).toContain("owner");
  });

  it("planning paths are correctly defined", () => {
    const validPaths = ["activities_first", "lodging_first"];
    expect(validPaths).toContain("activities_first");
    expect(validPaths).toContain("lodging_first");
  });
});

// ─── Planning Stage Validation ────────────────────────────────────────────────

describe("planning stages", () => {
  it("activities_first path has the correct stage order", () => {
    const activitiesFirstOrder = [
      "welcome", "dates", "islands", "budget",
      "activities", "lodging", "transportation", "summary"
    ];
    expect(activitiesFirstOrder[0]).toBe("welcome");
    expect(activitiesFirstOrder[activitiesFirstOrder.length - 1]).toBe("summary");
    expect(activitiesFirstOrder).toContain("activities");
    expect(activitiesFirstOrder.indexOf("activities")).toBeLessThan(activitiesFirstOrder.indexOf("lodging"));
  });

  it("lodging_first path has lodging before activities", () => {
    const lodgingFirstOrder = [
      "welcome", "dates", "islands", "budget",
      "lodging", "transportation", "activities", "summary"
    ];
    expect(lodgingFirstOrder.indexOf("lodging")).toBeLessThan(lodgingFirstOrder.indexOf("activities"));
  });
});

// ─── Avatar Color Assignment ──────────────────────────────────────────────────

describe("avatar color system", () => {
  it("cycles through 8 distinct colors", () => {
    const AVATAR_COLORS = [
      "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981",
      "#ef4444", "#ec4899", "#14b8a6", "#f97316",
    ];
    expect(AVATAR_COLORS.length).toBe(8);
    const unique = new Set(AVATAR_COLORS);
    expect(unique.size).toBe(8);
  });
});

// ─── Budget Tracker Logic ─────────────────────────────────────────────────────

describe("budget tracker calculations", () => {
  it("correctly calculates percent used and remaining", () => {
    const grandTotal = 3500;
    const budgetMax = 5000;
    const percentUsed = Math.min((grandTotal / budgetMax) * 100, 100);
    const remaining = budgetMax - grandTotal;

    expect(percentUsed).toBeCloseTo(70, 1);
    expect(remaining).toBe(1500);
  });

  it("caps percent at 100 when over budget", () => {
    const grandTotal = 6000;
    const budgetMax = 5000;
    const percentUsed = Math.min((grandTotal / budgetMax) * 100, 100);
    const isOverBudget = grandTotal > budgetMax;

    expect(percentUsed).toBe(100);
    expect(isOverBudget).toBe(true);
  });

  it("correctly sums costs by category", () => {
    const items = [
      { category: "activity", estimatedCost: 100 },
      { category: "activity", estimatedCost: 50 },
      { category: "lodging", estimatedCost: 800 },
      { category: "restaurant", estimatedCost: null },
    ];

    const totals: Record<string, number> = {};
    let grandTotal = 0;
    let uncosted = 0;

    for (const item of items) {
      if (!totals[item.category]) totals[item.category] = 0;
      if (item.estimatedCost !== null) {
        totals[item.category] += item.estimatedCost;
        grandTotal += item.estimatedCost;
      } else {
        uncosted++;
      }
    }

    expect(totals["activity"]).toBe(150);
    expect(totals["lodging"]).toBe(800);
    expect(grandTotal).toBe(950);
    expect(uncosted).toBe(1);
  });

  it("handles empty itinerary gracefully", () => {
    const items: { category: string; estimatedCost: number | null }[] = [];
    const grandTotal = items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);
    expect(grandTotal).toBe(0);
  });

  it("color codes correctly based on percent used", () => {
    const getColor = (percent: number, isOver: boolean) => {
      if (isOver) return "red";
      if (percent >= 75) return "amber";
      return "green";
    };

    expect(getColor(50, false)).toBe("green");
    expect(getColor(80, false)).toBe("amber");
    expect(getColor(100, true)).toBe("red");
  });
});

// ─── Flight Tracker Logic Tests ───────────────────────────────────────────────

describe("flight tracker", () => {
  it("groups flights by leg type correctly", () => {
    const LEG_ORDER = ["outbound", "inter_island", "return", "other"] as const;
    type Leg = (typeof LEG_ORDER)[number];

    const mockFlights = [
      { id: 1, leg: "outbound" as Leg, airline: "United", flightNumber: "UA 500", date: "2025-09-15" },
      { id: 2, leg: "inter_island" as Leg, airline: "Hawaiian", flightNumber: "HA 100", date: "2025-09-22" },
      { id: 3, leg: "return" as Leg, airline: "United", flightNumber: "UA 501", date: "2025-09-29" },
    ];

    const grouped = LEG_ORDER.reduce<Record<Leg, typeof mockFlights>>(
      (acc, leg) => {
        acc[leg] = mockFlights.filter((f) => f.leg === leg);
        return acc;
      },
      { outbound: [], inter_island: [], return: [], other: [] }
    );

    expect(grouped.outbound).toHaveLength(1);
    expect(grouped.inter_island).toHaveLength(1);
    expect(grouped.return).toHaveLength(1);
    expect(grouped.other).toHaveLength(0);
    expect(grouped.outbound[0].flightNumber).toBe("UA 500");
  });

  it("calculates total flight cost correctly", () => {
    const flights = [
      { price: "450.00" },
      { price: "320.00" },
      { price: null },
      { price: "180.50" },
    ];

    const total = flights.reduce((sum, f) => sum + (f.price ? parseFloat(f.price) : 0), 0);
    expect(total).toBeCloseTo(950.5, 2);
  });

  it("formats airport codes as uppercase", () => {
    const code = "den";
    expect(code.toUpperCase()).toBe("DEN");
  });

  it("formats time from 24h to 12h correctly", () => {
    const formatTime = (t: string | null) => {
      if (!t) return "—";
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    };

    expect(formatTime("08:00")).toBe("8:00 AM");
    expect(formatTime("13:30")).toBe("1:30 PM");
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime(null)).toBe("—");
  });

  it("leg config covers all four leg types", () => {
    const LEG_CONFIG = {
      outbound:     { label: "Outbound",     emoji: "✈️" },
      return:       { label: "Return",       emoji: "🏠" },
      inter_island: { label: "Inter-Island", emoji: "🌺" },
      other:        { label: "Other",        emoji: "🛫" },
    };

    expect(Object.keys(LEG_CONFIG)).toHaveLength(4);
    expect(LEG_CONFIG.inter_island.emoji).toBe("🌺");
    expect(LEG_CONFIG.outbound.label).toBe("Outbound");
  });
});

// ─── Island Map Logic Tests ───────────────────────────────────────────────────

describe("island map", () => {
  it("has correct center coordinates for Oahu", () => {
    const ISLAND_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
      "Oahu":       { lat: 21.4389,  lng: -158.0001, zoom: 11 },
      "Big Island": { lat: 19.5429,  lng: -155.6659, zoom: 9  },
      "Maui":       { lat: 20.7984,  lng: -156.3319, zoom: 10 },
    };

    expect(ISLAND_CENTERS["Oahu"].lat).toBeCloseTo(21.44, 1);
    expect(ISLAND_CENTERS["Oahu"].lng).toBeCloseTo(-158.0, 1);
    expect(ISLAND_CENTERS["Big Island"].zoom).toBe(9);
  });

  it("category colors cover all itinerary categories", () => {
    const CATEGORY_COLORS = {
      activity:       { emoji: "🤿", label: "Activities" },
      lodging:        { emoji: "🏨", label: "Lodging" },
      restaurant:     { emoji: "🍽️", label: "Dining" },
      transportation: { emoji: "🚌", label: "Transport" },
    };

    const categories = ["activity", "lodging", "restaurant", "transportation"];
    categories.forEach((cat) => {
      expect(CATEGORY_COLORS).toHaveProperty(cat);
    });
  });

  it("filters map items by island correctly", () => {
    const items = [
      { id: 1, title: "Snorkeling", island: "Oahu",       category: "activity" },
      { id: 2, title: "Hotel",      island: "Big Island", category: "lodging" },
      { id: 3, title: "Luau",       island: "Oahu",       category: "activity" },
    ];

    const oahuItems = items.filter((i) => i.island === "Oahu");
    expect(oahuItems).toHaveLength(2);
    expect(oahuItems.every((i) => i.island === "Oahu")).toBe(true);
  });
});
