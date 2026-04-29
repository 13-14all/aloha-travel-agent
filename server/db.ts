import { eq, desc, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  trips,
  tripMembers,
  tripInvites,
  chatMessages,
  itineraryItems,
  searchResults,
  flights,
  InsertTrip,
  InsertTripMember,
  InsertTripInvite,
  InsertChatMessage,
  InsertItineraryItem,
  InsertSearchResult,
  InsertFlight,
  SearchResultItem,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export async function createTrip(data: InsertTrip) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(trips).values(data);
  return result.insertId as number;
}

export async function getTripsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Return trips the user owns OR is a member of
  const owned = await db.select().from(trips).where(eq(trips.userId, userId));
  const memberRows = await db
    .select({ tripId: tripMembers.tripId })
    .from(tripMembers)
    .where(and(eq(tripMembers.userId, userId)));
  const memberTripIds = memberRows.map((r) => r.tripId).filter((id) => !owned.find((t) => t.id === id));
  let memberTrips: typeof owned = [];
  if (memberTripIds.length > 0) {
    memberTrips = await db
      .select()
      .from(trips)
      .where(or(...memberTripIds.map((id) => eq(trips.id, id))));
  }
  return [...owned, ...memberTrips].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getTripById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTrip(id: number, data: Partial<InsertTrip>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trips).set(data).where(eq(trips.id, id));
}

export async function deleteTrip(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(trips).where(eq(trips.id, id));
}

// ─── Trip Members ─────────────────────────────────────────────────────────────

export async function getTripMembers(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId))
    .orderBy(tripMembers.createdAt);
}

export async function getTripMemberById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tripMembers).where(eq(tripMembers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTripMemberByUserId(tripId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addTripMember(data: InsertTripMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(tripMembers).values(data);
  return result.insertId as number;
}

export async function updateTripMember(id: number, data: Partial<InsertTripMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tripMembers).set(data).where(eq(tripMembers.id, id));
}

export async function deleteTripMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tripMembers).where(eq(tripMembers.id, id));
}

// ─── Trip Invites ─────────────────────────────────────────────────────────────

export async function createInvite(data: InsertTripInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(tripInvites).values(data);
  return result.insertId as number;
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tripInvites).where(eq(tripInvites.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getInvitesByTrip(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tripInvites)
    .where(eq(tripInvites.tripId, tripId))
    .orderBy(desc(tripInvites.createdAt));
}

export async function acceptInvite(token: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(tripInvites)
    .set({ accepted: true, acceptedByUserId: userId })
    .where(eq(tripInvites.token, token));
}

export async function deleteInvite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tripInvites).where(eq(tripInvites.id, id));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function addChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(chatMessages).values(data);
  return result.insertId as number;
}

export async function getChatMessages(tripId: number, memberId?: number | null, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(chatMessages.tripId, tripId)];
  if (memberId != null) {
    conditions.push(eq(chatMessages.memberId, memberId));
  } else {
    // Trip-level chat (no specific member)
    conditions.push(eq(chatMessages.memberId, null as any));
  }
  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(chatMessages.createdAt)
    .limit(limit);
}

export async function clearChatMessages(tripId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(chatMessages).where(eq(chatMessages.tripId, tripId));
}

// ─── Itinerary Items ──────────────────────────────────────────────────────────

export async function addItineraryItem(data: InsertItineraryItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(itineraryItems).values(data);
  return result.insertId as number;
}

export async function getItineraryItems(tripId: number, memberId?: number | null, masterOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(itineraryItems.tripId, tripId), eq(itineraryItems.isSaved, true)];
  if (masterOnly) {
    conditions.push(eq(itineraryItems.isMaster, true));
  } else if (memberId != null) {
    conditions.push(eq(itineraryItems.memberId, memberId));
  }
  return db
    .select()
    .from(itineraryItems)
    .where(and(...conditions))
    .orderBy(itineraryItems.sortOrder, itineraryItems.createdAt);
}

export async function getAllMemberItems(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(itineraryItems)
    .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.isSaved, true)))
    .orderBy(desc(itineraryItems.votes), itineraryItems.createdAt);
}

export async function updateItineraryItem(id: number, data: Partial<InsertItineraryItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(itineraryItems).set(data).where(eq(itineraryItems.id, id));
}

export async function deleteItineraryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(itineraryItems).where(eq(itineraryItems.id, id));
}

// ─── Search Results ───────────────────────────────────────────────────────────

export async function saveSearchResults(data: InsertSearchResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(searchResults).values(data);
  return result.insertId as number;
}

export async function getSearchResults(tripId: number, category?: string, island?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(searchResults.tripId, tripId)];
  if (category) conditions.push(eq(searchResults.category, category as any));
  if (island) conditions.push(eq(searchResults.island, island));
  return db
    .select()
    .from(searchResults)
    .where(and(...conditions))
    .orderBy(desc(searchResults.createdAt))
    .limit(10);
}

// ─── Flights ──────────────────────────────────────────────────────────────────

export async function addFlight(data: InsertFlight): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(flights).values(data);
  return result.insertId as number;
}

export async function getFlightsByTrip(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(flights)
    .where(eq(flights.tripId, tripId))
    .orderBy(flights.date, flights.departureTime, flights.sortOrder);
}

export async function getFlightById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(flights).where(eq(flights.id, id)).limit(1);
  return result[0];
}

export async function updateFlight(id: number, data: Partial<InsertFlight>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(flights).set(data as any).where(eq(flights.id, id));
}

export async function deleteFlight(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(flights).where(eq(flights.id, id));
}

// ─── Change Requests ──────────────────────────────────────────────────────────

export async function createChangeRequest(data: {
  userId: number;
  userName?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: "bug" | "feature" | "improvement" | "question";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { changeRequests } = await import("../drizzle/schema");
  const result = await db.insert(changeRequests).values({
    userId: data.userId,
    userName: data.userName,
    title: data.title,
    description: data.description,
    priority: data.priority,
    category: data.category,
  });
  return (result[0] as any).insertId as number;
}

export async function getChangeRequests() {
  const db = await getDb();
  if (!db) return [];
  const { changeRequests } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  return db.select().from(changeRequests).orderBy(desc(changeRequests.createdAt));
}

export async function updateChangeRequest(
  id: number,
  data: {
    status?: "pending" | "in-progress" | "done" | "wont-do";
    adminNotes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { changeRequests } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(changeRequests).set(data).where(eq(changeRequests.id, id));
}

export async function getUserChangeRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { changeRequests } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");
  return db
    .select()
    .from(changeRequests)
    .where(eq(changeRequests.userId, userId))
    .orderBy(desc(changeRequests.createdAt));
}
