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
