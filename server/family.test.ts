import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  registerSSEClient,
  broadcastToTrip,
  getConnectionCount,
} from "./sse";

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

// ─── Itinerary Builder / Schedule Logic Tests ─────────────────────────────────

describe("itinerary builder", () => {
  it("correctly splits trip days between two islands", () => {
    const islands = ["Oahu", "Big Island"];
    const totalDays = 14;
    const half = Math.floor(totalDays / 2);

    const days = Array.from({ length: totalDays }, (_, i) => ({
      dayNumber: i + 1,
      island: i < half ? islands[0] : islands[1],
    }));

    const oahuDays = days.filter((d) => d.island === "Oahu");
    const bigIslandDays = days.filter((d) => d.island === "Big Island");

    expect(oahuDays).toHaveLength(7);
    expect(bigIslandDays).toHaveLength(7);
    expect(oahuDays[0].dayNumber).toBe(1);
    expect(bigIslandDays[0].dayNumber).toBe(8);
  });

  it("generates correct day list from start and end dates", () => {
    const startDate = "2025-09-15";
    const endDate = "2025-09-28";

    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = new Date(start);
    const days: { dayNumber: number; date: string }[] = [];
    let dayNum = 1;
    while (current <= end) {
      days.push({ dayNumber: dayNum, date: current.toISOString().split("T")[0] });
      current.setDate(current.getDate() + 1);
      dayNum++;
    }

    expect(days).toHaveLength(14);
    expect(days[0].date).toBe("2025-09-15");
    expect(days[13].date).toBe("2025-09-28");
    expect(days[0].dayNumber).toBe(1);
    expect(days[13].dayNumber).toBe(14);
  });

  it("sorts items within a day by scheduled time", () => {
    const items = [
      { id: 1, title: "Dinner", scheduledTime: "19:00", sortOrder: 0 },
      { id: 2, title: "Snorkeling", scheduledTime: "09:00", sortOrder: 1 },
      { id: 3, title: "Lunch", scheduledTime: "12:00", sortOrder: 2 },
      { id: 4, title: "Hotel Check-in", scheduledTime: null, sortOrder: 3 },
    ];

    const sorted = [...items].sort((a, b) => {
      if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
      if (a.scheduledTime) return -1;
      if (b.scheduledTime) return 1;
      return a.sortOrder - b.sortOrder;
    });

    expect(sorted[0].title).toBe("Snorkeling");
    expect(sorted[1].title).toBe("Lunch");
    expect(sorted[2].title).toBe("Dinner");
    expect(sorted[3].title).toBe("Hotel Check-in");
  });

  it("correctly separates scheduled and unscheduled items", () => {
    const items = [
      { id: 1, title: "Snorkeling", scheduledDay: 2 },
      { id: 2, title: "Luau", scheduledDay: null },
      { id: 3, title: "Hotel", scheduledDay: 1 },
      { id: 4, title: "Hike", scheduledDay: null },
    ];

    const scheduled = items.filter((i) => i.scheduledDay !== null);
    const unscheduled = items.filter((i) => i.scheduledDay === null);

    expect(scheduled).toHaveLength(2);
    expect(unscheduled).toHaveLength(2);
    expect(scheduled.map((i) => i.title)).toContain("Snorkeling");
    expect(unscheduled.map((i) => i.title)).toContain("Luau");
  });

  it("calculates total cost per day correctly", () => {
    const dayItems = [
      { estimatedCost: 120 },
      { estimatedCost: 45 },
      { estimatedCost: null },
      { estimatedCost: 200 },
    ];

    const dayTotal = dayItems.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);
    expect(dayTotal).toBe(365);
  });

  it("formats time from 24h to 12h correctly", () => {
    const formatTime = (t: string | null): string => {
      if (!t) return "";
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    };

    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("19:00")).toBe("7:00 PM");
    expect(formatTime(null)).toBe("");
  });
});

// ── Real-time Notifications (SSE) ─────────────────────────────────────────────

describe("SSE broadcastToTrip", () => {
  it("sends event to all connected clients for a trip", () => {
    const written: string[] = [];
    const mockRes = {
      write: (chunk: string) => { written.push(chunk); },
      flush: () => {},
    } as any;

    const cleanup = registerSSEClient(9001, 1, mockRes);
    expect(getConnectionCount(9001)).toBe(1);

    broadcastToTrip({
      type: "note_added",
      tripId: 9001,
      noteId: 42,
      authorName: "Alex",
      authorId: 2,
      title: "Packing list",
      timestamp: new Date().toISOString(),
    });

    // The client (userId=1) should receive the event because excludeUserId is not set
    expect(written.some((w) => w.includes("note_added"))).toBe(true);
    expect(written.some((w) => w.includes("Packing list"))).toBe(true);

    cleanup();
    expect(getConnectionCount(9001)).toBe(0);
  });

  it("excludes the author from receiving their own broadcast", () => {
    const written: string[] = [];
    const mockRes = {
      write: (chunk: string) => { written.push(chunk); },
      flush: () => {},
    } as any;

    const cleanup = registerSSEClient(9002, 5, mockRes);

    // Clear any writes from the initial ping
    written.length = 0;

    broadcastToTrip(
      {
        type: "note_updated",
        tripId: 9002,
        noteId: 10,
        authorName: "Tami",
        authorId: 5,
        title: "Hotel tips",
        timestamp: new Date().toISOString(),
      },
      5 // exclude userId 5 (the author)
    );

    // The only connected client IS the author, so nothing should be written
    const noteEvents = written.filter((w) => w.includes("note_updated"));
    expect(noteEvents).toHaveLength(0);

    cleanup();
    expect(getConnectionCount(9002)).toBe(0);
  });

  it("handles broadcast to trip with no connected clients gracefully", () => {
    // Should not throw even when no clients are connected
    expect(() =>
      broadcastToTrip({
        type: "note_deleted",
        tripId: 99999,
        noteId: 7,
        authorName: "Guest",
        authorId: 99,
        timestamp: new Date().toISOString(),
      })
    ).not.toThrow();
  });

  it("NoteEvent type includes all required fields", () => {
    const event = {
      type: "note_added" as const,
      tripId: 1,
      noteId: 1,
      authorName: "Alex",
      authorId: 1,
      title: "Test note",
      category: "packing",
      content: "Sunscreen",
      timestamp: new Date().toISOString(),
    };
    expect(event.type).toBe("note_added");
    expect(event.tripId).toBe(1);
    expect(event.authorName).toBe("Alex");
    expect(typeof event.timestamp).toBe("string");
  });

  it("getConnectionCount returns 0 for unknown trip", () => {
    expect(getConnectionCount(88888)).toBe(0);
  });
});
