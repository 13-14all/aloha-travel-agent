import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  trips,
  chatMessages,
  itineraryItems,
  searchResults,
  InsertTrip,
  InsertChatMessage,
  InsertItineraryItem,
  InsertSearchResult,
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
  return db.select().from(trips).where(eq(trips.userId, userId)).orderBy(desc(trips.updatedAt));
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

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function addChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(chatMessages).values(data);
  return result.insertId as number;
}

export async function getChatMessages(tripId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.tripId, tripId))
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

export async function getItineraryItems(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(itineraryItems)
    .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.isSaved, true)))
    .orderBy(itineraryItems.sortOrder, itineraryItems.createdAt);
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
