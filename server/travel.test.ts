import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getTripsByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      title: "Hawaii Adventure",
      destination: "Hawaii",
      destinationKey: "hawaii",
      mascotType: "hula_dancer",
      status: "planning",
      planningStage: "welcome",
      startDate: null,
      endDate: null,
      budgetMin: null,
      budgetMax: null,
      islands: [],
      guestCount: 2,
      guestNames: [],
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getTripById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        id: 1,
        userId: 1,
        title: "Hawaii Adventure",
        destination: "Hawaii",
        destinationKey: "hawaii",
        mascotType: "hula_dancer",
        status: "planning",
        planningStage: "welcome",
        startDate: null,
        endDate: null,
        budgetMin: null,
        budgetMax: null,
        islands: [],
        guestCount: 2,
        guestNames: [],
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(undefined);
  }),
  createTrip: vi.fn().mockResolvedValue(42),
  updateTrip: vi.fn().mockResolvedValue(undefined),
  deleteTrip: vi.fn().mockResolvedValue(undefined),
  getChatMessages: vi.fn().mockResolvedValue([]),
  addChatMessage: vi.fn().mockResolvedValue(10),
  clearChatMessages: vi.fn().mockResolvedValue(undefined),
  getItineraryItems: vi.fn().mockResolvedValue([]),
  addItineraryItem: vi.fn().mockResolvedValue(20),
  updateItineraryItem: vi.fn().mockResolvedValue(undefined),
  deleteItineraryItem: vi.fn().mockResolvedValue(undefined),
  saveSearchResults: vi.fn().mockResolvedValue(30),
  getSearchResults: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./agent", () => ({
  chatWithAgent: vi.fn().mockResolvedValue("Aloha! Let's plan your Hawaii trip!"),
  extractTripData: vi.fn().mockResolvedValue({}),
  searchForRecommendations: vi.fn().mockResolvedValue([
    {
      title: "Hanauma Bay Snorkeling",
      description: "World-class snorkeling in a protected marine sanctuary.",
      location: "East Oahu",
      priceRange: "$25/person",
      tags: ["snorkeling", "beach", "nature"],
      source: "TripAdvisor",
      rating: 4.8,
    },
  ]),
  DESTINATION_CONFIGS: {
    hawaii: {
      name: "Hawaii",
      mascot: "hula_dancer",
      mascotEmoji: "🌺",
      islands: ["Oahu", "Big Island", "Maui"],
      greeting: "Aloha!",
      searchTerms: ["Hawaii"],
    },
    scotland: {
      name: "Scotland",
      mascot: "highlander",
      mascotEmoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
      islands: ["Mainland", "Isle of Skye"],
      greeting: "Och aye!",
      searchTerms: ["Scotland"],
    },
  },
}));

// ─── Test Context ─────────────────────────────────────────────────────────────

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-001",
      email: "test@example.com",
      name: "Test Traveler",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeTruthy();
    expect(user?.name).toBe("Test Traveler");
  });
});

describe("trips.list", () => {
  it("returns trips for the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const trips = await caller.trips.list();
    expect(Array.isArray(trips)).toBe(true);
    expect(trips.length).toBe(1);
    expect(trips[0].title).toBe("Hawaii Adventure");
  });
});

describe("trips.get", () => {
  it("returns a specific trip by ID", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const trip = await caller.trips.get({ id: 1 });
    expect(trip.id).toBe(1);
    expect(trip.destination).toBe("Hawaii");
    expect(trip.mascotType).toBe("hula_dancer");
  });

  it("throws when trip not found", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.trips.get({ id: 999 })).rejects.toThrow("Trip not found");
  });
});

describe("trips.create", () => {
  it("creates a new Hawaii trip with correct mascot", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.trips.create({
      title: "My Hawaii Trip",
      destination: "Hawaii",
      destinationKey: "hawaii",
    });
    expect(result.id).toBe(42);
  });

  it("creates a Scotland trip with highlander mascot", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.trips.create({
      title: "Scotland Adventure",
      destination: "Scotland",
      destinationKey: "scotland",
    });
    expect(result.id).toBe(42);
  });
});

describe("trips.destinations", () => {
  it("returns available destination configs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const destinations = await caller.trips.destinations();
    expect(Array.isArray(destinations)).toBe(true);
    const hawaii = destinations.find((d) => d.key === "hawaii");
    expect(hawaii).toBeTruthy();
    expect(hawaii?.mascot).toBe("hula_dancer");
    expect(hawaii?.mascotEmoji).toBe("🌺");
  });
});

describe("chat.messages", () => {
  it("returns empty chat history for a new trip", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const messages = await caller.chat.messages({ tripId: 1 });
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBe(0);
  });
});

describe("chat.send", () => {
  it("sends a message and returns AI response", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.send({
      tripId: 1,
      message: "We want to go to Hawaii in September!",
    });
    expect(result.content).toBeTruthy();
    expect(result.role).toBe("assistant");
    expect(typeof result.content).toBe("string");
  });
});

describe("itinerary.list", () => {
  it("returns empty itinerary for a new trip", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const items = await caller.itinerary.list({ tripId: 1 });
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });
});

describe("itinerary.add", () => {
  it("adds an activity to the itinerary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.itinerary.add({
      tripId: 1,
      category: "activity",
      title: "Hanauma Bay Snorkeling",
      description: "World-class snorkeling",
      island: "Oahu",
      priceRange: "$25/person",
    });
    expect(result.id).toBe(20);
  });

  it("adds lodging to the itinerary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.itinerary.add({
      tripId: 1,
      category: "lodging",
      title: "Beachfront Airbnb in Kailua",
      island: "Oahu",
      priceRange: "$250/night",
    });
    expect(result.id).toBe(20);
  });
});

describe("search.find", () => {
  it("searches for activities on Oahu", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const results = await caller.search.find({
      tripId: 1,
      category: "activity",
      island: "Oahu",
      budget: "$5,000-10,000",
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBeTruthy();
    expect(results[0].description).toBeTruthy();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
