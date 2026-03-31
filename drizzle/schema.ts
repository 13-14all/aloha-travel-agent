import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Trips ────────────────────────────────────────────────────────────────────

export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  destinationKey: varchar("destinationKey", { length: 64 }).notNull().default("hawaii"),
  mascotType: varchar("mascotType", { length: 64 }).notNull().default("hula_dancer"),
  status: mysqlEnum("status", ["planning", "booked", "completed", "archived"]).default("planning").notNull(),
  planningStage: mysqlEnum("planningStage", [
    "welcome",
    "dates",
    "islands",
    "budget",
    "activities",
    "lodging",
    "transportation",
    "summary",
  ]).default("welcome").notNull(),
  startDate: varchar("startDate", { length: 32 }),
  endDate: varchar("endDate", { length: 32 }),
  budgetMin: int("budgetMin"),
  budgetMax: int("budgetMax"),
  islands: json("islands").$type<string[]>(),
  guestCount: int("guestCount").default(2),
  guestNames: json("guestNames").$type<string[]>(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// ─── Chat Messages ────────────────────────────────────────────────────────────

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Itinerary Items ──────────────────────────────────────────────────────────

export const itineraryItems = mysqlTable("itinerary_items", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["activity", "lodging", "restaurant", "transportation", "note"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  island: varchar("island", { length: 128 }),
  date: varchar("date", { length: 32 }),
  timeOfDay: mysqlEnum("timeOfDay", ["morning", "afternoon", "evening", "all_day"]),
  priceRange: varchar("priceRange", { length: 64 }),
  url: text("url"),
  imageUrl: text("imageUrl"),
  notes: text("notes"),
  isSaved: boolean("isSaved").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ItineraryItem = typeof itineraryItems.$inferSelect;
export type InsertItineraryItem = typeof itineraryItems.$inferInsert;

// ─── Search Results ───────────────────────────────────────────────────────────

export const searchResults = mysqlTable("search_results", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  category: mysqlEnum("category", ["activity", "lodging", "restaurant", "transportation"]).notNull(),
  island: varchar("island", { length: 128 }),
  query: text("query"),
  results: json("results").$type<SearchResultItem[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SearchResultItem = {
  title: string;
  description: string;
  location?: string;
  priceRange?: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
  rating?: number;
  source?: string;
};

export type SearchResult = typeof searchResults.$inferSelect;
export type InsertSearchResult = typeof searchResults.$inferInsert;
