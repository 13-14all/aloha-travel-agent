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

// ─── Trip Members ─────────────────────────────────────────────────────────────
// Represents people added to a trip (both registered users and named guests).
// The trip owner is always userId from the trips table.
// role: owner = full control; planner = can add/edit items; viewer = read-only

export const tripMembers = mysqlTable("trip_members", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  /** Linked user account (null for pending/guest members who haven't signed in yet) */
  userId: int("userId"),
  /** Display name — always set, even before account link */
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  /** Permission level */
  role: mysqlEnum("role", ["owner", "planner", "viewer"]).default("planner").notNull(),
  /**
   * Planning path chosen by this member:
   * - activities_first: dates → islands → budget → activities → restaurants → lodging → transport
   * - lodging_first:    dates → islands → budget → lodging → transport → activities → restaurants
   */
  planningPath: mysqlEnum("planningPath", ["activities_first", "lodging_first"]).default("activities_first").notNull(),
  /** Current stage within their personal planning path */
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
  /** Avatar color (hex) for visual distinction in the UI */
  avatarColor: varchar("avatarColor", { length: 16 }).default("#0ea5e9").notNull(),
  /** Whether this member has completed their personal planning phase */
  planningComplete: boolean("planningComplete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TripMember = typeof tripMembers.$inferSelect;
export type InsertTripMember = typeof tripMembers.$inferInsert;

// ─── Trip Invites ─────────────────────────────────────────────────────────────

export const tripInvites = mysqlTable("trip_invites", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  /** Invite token (random, URL-safe) */
  token: varchar("token", { length: 128 }).notNull().unique(),
  /** Role that will be assigned when the invite is accepted */
  role: mysqlEnum("role", ["planner", "viewer"]).default("planner").notNull(),
  /** Optional: pre-fill the invitee's name */
  inviteeName: varchar("inviteeName", { length: 128 }),
  /** Optional: pre-fill the invitee's email */
  inviteeEmail: varchar("inviteeEmail", { length: 320 }),
  /** Whether the invite has been accepted */
  accepted: boolean("accepted").default(false).notNull(),
  /** Who accepted (userId) */
  acceptedByUserId: int("acceptedByUserId"),
  /** Expiry timestamp (null = never expires) */
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripInvite = typeof tripInvites.$inferSelect;
export type InsertTripInvite = typeof tripInvites.$inferInsert;

// ─── Chat Messages ────────────────────────────────────────────────────────────

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId").notNull(),
  /** Which trip member this chat belongs to (null = trip-level chat) */
  memberId: int("memberId"),
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
  /** Which member saved this item (for individual planning lists) */
  memberId: int("memberId"),
  /** Whether this is in the master/merged itinerary (true) or a member's personal list (false) */
  isMaster: boolean("isMaster").default(false).notNull(),
  /** Upvote count from other members during merge phase */
  votes: int("votes").default(0).notNull(),
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
