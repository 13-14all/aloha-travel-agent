import { z } from "zod";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createTrip,
  getTripsByUser,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripMembers,
  getTripMemberById,
  getTripMemberByUserId,
  addTripMember,
  updateTripMember,
  deleteTripMember,
  createInvite,
  getInviteByToken,
  getInvitesByTrip,
  acceptInvite,
  deleteInvite,
  addChatMessage,
  getChatMessages,
  clearChatMessages,
  addItineraryItem,
  getItineraryItems,
  getAllMemberItems,
  updateItineraryItem,
  deleteItineraryItem,
  saveSearchResults,
  getSearchResults,
  addFlight,
  getFlightsByTrip,
  getFlightById,
  updateFlight,
  deleteFlight,
  createChangeRequest,
  getChangeRequests,
  updateChangeRequest,
  getUserChangeRequests,
} from "./db";
import { chatWithAgent, extractTripData, searchForRecommendations, DESTINATION_CONFIGS } from "./agent";

// ─── Permission Helpers ───────────────────────────────────────────────────────

async function assertTripAccess(tripId: number, userId: number, requireRole?: "owner" | "planner") {
  const trip = await getTripById(tripId);
  if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

  // Owner always has full access
  if (trip.userId === userId) return { trip, role: "owner" as const };

  // Check member role
  const member = await getTripMemberByUserId(tripId, userId);
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this trip" });

  if (requireRole === "owner" && member.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the trip owner can perform this action" });
  }
  if (requireRole === "planner" && member.role === "viewer") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Viewers cannot make changes to this trip" });
  }

  return { trip, role: member.role };
}

// ─── Avatar Colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    /** Mark the current user as having seen their welcome page */
    markWelcomed: protectedProcedure.mutation(async ({ ctx }) => {
      const { drizzle } = await import("drizzle-orm/mysql2");
      if (!process.env.DATABASE_URL) return { success: false };
      const db = drizzle(process.env.DATABASE_URL);
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ hasSeenWelcome: true }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Trips ──────────────────────────────────────────────────────────────────
  trips: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getTripsByUser(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { trip } = await assertTripAccess(input.id, ctx.user.id);
        return trip;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          destination: z.string().min(1),
          destinationKey: z.string().default("hawaii"),
          members: z.array(z.object({
            name: z.string().min(1),
            email: z.string().optional(),
            role: z.enum(["planner", "viewer"]),
            planningPath: z.enum(["activities_first", "lodging_first"]),
          })).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const config = DESTINATION_CONFIGS[input.destinationKey] || DESTINATION_CONFIGS.hawaii;
        const tripId = await createTrip({
          userId: ctx.user.id,
          title: input.title,
          destination: input.destination,
          destinationKey: input.destinationKey,
          mascotType: config.mascot,
          planningStage: "welcome",
          status: "planning",
          guestCount: 2,
        });

        // Add the owner as a member automatically
        await addTripMember({
          tripId,
          userId: ctx.user.id,
          name: ctx.user.name || "Trip Owner",
          email: ctx.user.email || undefined,
          role: "owner",
          planningPath: "activities_first",
          planningStage: "welcome",
          avatarColor: AVATAR_COLORS[0],
        });

        // Add any additional members provided at creation
        if (input.members && input.members.length > 0) {
          for (let i = 0; i < input.members.length; i++) {
            const m = input.members[i];
            await addTripMember({
              tripId,
              name: m.name,
              email: m.email,
              role: m.role,
              planningPath: m.planningPath,
              planningStage: "welcome",
              avatarColor: AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length],
            });
          }
        }

        return { id: tripId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          budgetMin: z.number().optional(),
          budgetMax: z.number().optional(),
          islands: z.array(z.string()).optional(),
          guestCount: z.number().optional(),
          guestNames: z.array(z.string()).optional(),
          planningStage: z
            .enum(["welcome", "dates", "islands", "budget", "activities", "lodging", "transportation", "summary"])
            .optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.id, ctx.user.id, "planner");
        const { id, ...data } = input;
        await updateTrip(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.id, ctx.user.id, "owner");
        await deleteTrip(input.id);
        return { success: true };
      }),

    destinations: publicProcedure.query(() => {
      return Object.entries(DESTINATION_CONFIGS).map(([key, config]) => ({
        key,
        name: config.name,
        mascot: config.mascot,
        mascotEmoji: config.mascotEmoji,
        islands: config.islands,
        greeting: config.greeting,
      }));
    }),
  }),

  // ─── Members ─────────────────────────────────────────────────────────────────
  members: router({
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        return getTripMembers(input.tripId);
      }),

    add: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          name: z.string().min(1),
          email: z.string().optional(),
          role: z.enum(["planner", "viewer"]),
          planningPath: z.enum(["activities_first", "lodging_first"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "owner");
        const existingMembers = await getTripMembers(input.tripId);
        const colorIndex = existingMembers.length % AVATAR_COLORS.length;
        const id = await addTripMember({
          tripId: input.tripId,
          name: input.name,
          email: input.email,
          role: input.role,
          planningPath: input.planningPath,
          planningStage: "welcome",
          avatarColor: AVATAR_COLORS[colorIndex],
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tripId: z.number(),
          name: z.string().optional(),
          role: z.enum(["planner", "viewer"]).optional(),
          planningPath: z.enum(["activities_first", "lodging_first"]).optional(),
          planningStage: z.enum(["welcome", "dates", "islands", "budget", "activities", "lodging", "transportation", "summary"]).optional(),
          planningComplete: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Owner can update any member; planners can only update themselves
        const { trip } = await assertTripAccess(input.tripId, ctx.user.id);
        const member = await getTripMemberById(input.id);
        if (!member || member.tripId !== input.tripId) throw new TRPCError({ code: "NOT_FOUND" });

        // Non-owners can only update their own member record
        if (trip.userId !== ctx.user.id) {
          const myMember = await getTripMemberByUserId(input.tripId, ctx.user.id);
          if (!myMember || myMember.id !== input.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only update your own profile" });
          }
        }

        const { id, tripId, ...data } = input;
        await updateTripMember(id, data as any);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number(), tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "owner");
        await deleteTripMember(input.id);
        return { success: true };
      }),

    /** Get the current user's member record for a trip */
    myMember: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { trip } = await assertTripAccess(input.tripId, ctx.user.id);
        // If the user is the trip owner, find their owner member record
        const member = await getTripMemberByUserId(input.tripId, ctx.user.id);
        return member ?? null;
      }),
  }),

  // ─── Invites ──────────────────────────────────────────────────────────────────
  invites: router({
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "owner");
        return getInvitesByTrip(input.tripId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          role: z.enum(["planner", "viewer"]),
          inviteeName: z.string().optional(),
          inviteeEmail: z.string().optional(),
          /** Days until expiry; null = never */
          expiresInDays: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "owner");
        const token = nanoid(32);
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 86400_000)
          : undefined;
        await createInvite({
          tripId: input.tripId,
          token,
          role: input.role,
          inviteeName: input.inviteeName,
          inviteeEmail: input.inviteeEmail,
          expiresAt,
        });
        return { token };
      }),

    /** Fetch invite details by token (public — for the accept page) */
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or expired" });
        if (invite.accepted) throw new TRPCError({ code: "BAD_REQUEST", message: "This invite has already been used" });
        if (invite.expiresAt && invite.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This invite link has expired" });
        }
        const trip = await getTripById(invite.tripId);
        return { invite, tripTitle: trip?.title, tripDestination: trip?.destination };
      }),

    /** Accept an invite — creates a member record and links the user */
    accept: protectedProcedure
      .input(z.object({
        token: z.string(),
        name: z.string().min(1),
        planningPath: z.enum(["activities_first", "lodging_first"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const invite = await getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
        if (invite.accepted) throw new TRPCError({ code: "BAD_REQUEST", message: "Already used" });
        if (invite.expiresAt && invite.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite expired" });
        }

        const existingMembers = await getTripMembers(invite.tripId);
        const colorIndex = existingMembers.length % AVATAR_COLORS.length;

        await addTripMember({
          tripId: invite.tripId,
          userId: ctx.user.id,
          name: input.name,
          email: ctx.user.email || undefined,
          role: invite.role,
          planningPath: input.planningPath,
          planningStage: "welcome",
          avatarColor: AVATAR_COLORS[colorIndex],
        });

        await acceptInvite(input.token, ctx.user.id);
        return { tripId: invite.tripId };
      }),

    revoke: protectedProcedure
      .input(z.object({ id: z.number(), tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "owner");
        await deleteInvite(input.id);
        return { success: true };
      }),
  }),

  // ─── Chat ────────────────────────────────────────────────────────────────────
  chat: router({
    messages: protectedProcedure
      .input(z.object({ tripId: z.number(), memberId: z.number().nullable().optional() }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        return getChatMessages(input.tripId, input.memberId);
      }),

    send: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          message: z.string().min(1),
          /** If provided, this is a member-specific chat session */
          memberId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { trip } = await assertTripAccess(input.tripId, ctx.user.id, "planner");

        // Get member context if applicable
        const member = input.memberId ? await getTripMemberById(input.memberId) : null;

        // Save user message
        await addChatMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
          memberId: input.memberId ?? undefined,
          role: "user",
          content: input.message,
        });

        // Get conversation history
        const history = await getChatMessages(input.tripId, input.memberId, 30);

        // Build the right system prompt (member-specific or trip-level)
        const aiResponse = await chatWithAgent(trip, history, input.message, member ?? undefined);

        // Save AI response
        const aiMsgId = await addChatMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
          memberId: input.memberId ?? undefined,
          role: "assistant",
          content: aiResponse,
        });

        // Extract and update trip data from conversation
        const recentConversation = history
          .slice(-6)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");
        const extracted = await extractTripData(
          recentConversation + `\nuser: ${input.message}\nassistant: ${aiResponse}`,
          trip
        );

        if (Object.keys(extracted).length > 0) {
          await updateTrip(input.tripId, extracted as any);
        }

        // If member-specific chat, advance their planning stage if AI suggested it
        if (member && extracted.planningStage && extracted.planningStage !== member.planningStage) {
          await updateTripMember(member.id, { planningStage: extracted.planningStage as any });
        }

        return {
          id: aiMsgId,
          content: aiResponse,
          role: "assistant" as const,
          tripUpdates: extracted,
        };
      }),

    initWelcome: protectedProcedure
      .input(z.object({ tripId: z.number(), memberId: z.number().nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { trip } = await assertTripAccess(input.tripId, ctx.user.id);

        const existingMessages = await getChatMessages(input.tripId, input.memberId, 1);
        if (existingMessages.length > 0) return { alreadyInitialized: true };

        const member = input.memberId ? await getTripMemberById(input.memberId) : null;
        const config = DESTINATION_CONFIGS[trip.destinationKey] || DESTINATION_CONFIGS.hawaii;

        let welcomeMessage: string;
        if (member) {
          const pathLabel = member.planningPath === "lodging_first"
            ? "finding the perfect places to stay first, then activities"
            : "exploring activities first, then finding the perfect place to stay";
          welcomeMessage = `${config.greeting}\n\nHi **${member.name}**! I see you'd like to start by ${pathLabel} — great choice! Let's begin.\n\nFirst, could you tell me **when you're planning to travel**? Even rough dates are helpful — we can always adjust later!`;
        } else {
          welcomeMessage = config.greeting + `\n\nTo get started, could you tell me **when you're planning to travel**? Even rough dates are helpful — we can always adjust later!`;
        }

        await addChatMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
          memberId: input.memberId ?? undefined,
          role: "assistant",
          content: welcomeMessage,
        });

        return { alreadyInitialized: false, message: welcomeMessage };
      }),

    clear: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "owner");
        await clearChatMessages(input.tripId);
        return { success: true };
      }),
  }),

  // ─── Itinerary ───────────────────────────────────────────────────────────────
  itinerary: router({
    list: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        memberId: z.number().nullable().optional(),
        masterOnly: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        return getItineraryItems(input.tripId, input.memberId, input.masterOnly);
      }),

    /** Get all members' items for the merge view */
    allMemberItems: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        return getAllMemberItems(input.tripId);
      }),

    add: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          memberId: z.number().nullable().optional(),
          isMaster: z.boolean().optional(),
          category: z.enum(["activity", "lodging", "restaurant", "transportation", "note"]),
          title: z.string().min(1),
          description: z.string().optional(),
          location: z.string().optional(),
          island: z.string().optional(),
          date: z.string().optional(),
          timeOfDay: z.enum(["morning", "afternoon", "evening", "all_day"]).optional(),
          priceRange: z.string().optional(),
          url: z.string().optional(),
          imageUrl: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "planner");
        const id = await addItineraryItem({
          ...input,
          userId: ctx.user.id,
          isSaved: true,
          isMaster: input.isMaster ?? false,
          sortOrder: 0,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          date: z.string().optional(),
          timeOfDay: z.enum(["morning", "afternoon", "evening", "all_day"]).optional(),
          notes: z.string().optional(),
          sortOrder: z.number().optional(),
          isMaster: z.boolean().optional(),
          estimatedCost: z.number().nullable().optional(),
          costNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateItineraryItem(id, data as any);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteItineraryItem(input.id);
        return { success: true };
      }),

    /** Upvote an item during the merge phase */
    vote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Increment votes by 1
        const db = await import("./db").then((m) => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { itineraryItems: items } = await import("../drizzle/schema");
        const { eq, sql } = await import("drizzle-orm");
        await db.update(items).set({ votes: sql`votes + 1` }).where(eq(items.id, input.id));
        return { success: true };
      }),

    /** Promote a member item to the master itinerary */
    promoteToMaster: protectedProcedure
      .input(z.object({ id: z.number(), tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "owner");
        await updateItineraryItem(input.id, { isMaster: true });
        return { success: true };
      }),

    /** Generate a plain-text itinerary summary for PDF export */
    exportSummary: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { trip } = await assertTripAccess(input.tripId, ctx.user.id);
        const members = await getTripMembers(input.tripId);
        const masterItems = await getItineraryItems(input.tripId, null, true);

        // Group by island then category
        const byIsland: Record<string, typeof masterItems> = {};
        for (const item of masterItems) {
          const island = item.island || "General";
          if (!byIsland[island]) byIsland[island] = [];
          byIsland[island].push(item);
        }

        return {
          trip,
          members,
          byIsland,
          totalItems: masterItems.length,
        };
      }),
  }),

  // ─── Budget ─────────────────────────────────────────────────────────────────
  budget: router({
    /** Get a full budget summary: total spent vs budget, broken down by category */
    summary: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { trip } = await assertTripAccess(input.tripId, ctx.user.id);

        // Fetch all master itinerary items
        const masterItems = await getItineraryItems(input.tripId, null, true);

        const CATEGORIES = ["activity", "lodging", "restaurant", "transportation", "note"] as const;
        type Category = typeof CATEGORIES[number];

        const categoryTotals: Record<Category, { total: number; count: number; uncosted: number }> = {
          activity:       { total: 0, count: 0, uncosted: 0 },
          lodging:        { total: 0, count: 0, uncosted: 0 },
          restaurant:     { total: 0, count: 0, uncosted: 0 },
          transportation: { total: 0, count: 0, uncosted: 0 },
          note:           { total: 0, count: 0, uncosted: 0 },
        };

        let grandTotal = 0;
        let totalUncosted = 0;

        for (const item of masterItems) {
          const cat = item.category as Category;
          categoryTotals[cat].count++;
          const cost = item.estimatedCost ? parseFloat(String(item.estimatedCost)) : null;
          if (cost !== null && !isNaN(cost)) {
            categoryTotals[cat].total += cost;
            grandTotal += cost;
          } else {
            categoryTotals[cat].uncosted++;
            totalUncosted++;
          }
        }

        const budgetMax = trip.budgetMax ?? null;
        const budgetMin = trip.budgetMin ?? null;
        const percentUsed = budgetMax ? Math.min((grandTotal / budgetMax) * 100, 100) : null;
        const remaining = budgetMax ? budgetMax - grandTotal : null;
        const isOverBudget = budgetMax ? grandTotal > budgetMax : false;

        return {
          grandTotal,
          budgetMax,
          budgetMin,
          percentUsed,
          remaining,
          isOverBudget,
          totalItems: masterItems.length,
          totalUncosted,
          categoryTotals,
          items: masterItems.map((item) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            island: item.island,
            estimatedCost: item.estimatedCost ? parseFloat(String(item.estimatedCost)) : null,
            costNotes: item.costNotes,
            priceRange: item.priceRange,
          })),
        };
      }),
  }),

  // ─── Search ──────────────────────────────────────────────────────────────────
  search: router({
    find: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          category: z.enum(["activity", "lodging", "restaurant", "transportation"]),
          island: z.string(),
          budget: z.string().optional(),
          preferences: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { trip } = await assertTripAccess(input.tripId, ctx.user.id, "planner");

        const results = await searchForRecommendations(
          input.category,
          input.island,
          trip.destination,
          input.budget,
          input.preferences
        );

        await saveSearchResults({
          tripId: input.tripId,
          category: input.category,
          island: input.island,
          query: `${input.category} on ${input.island}`,
          results,
        });

        return results;
      }),

    history: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          category: z.string().optional(),
          island: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        return getSearchResults(input.tripId, input.category, input.island);
      }),
  }),

  // ─── Flights ────────────────────────────────────────────────────────────────
  flights: router({
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        return getFlightsByTrip(input.tripId);
      }),

    add: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          leg: z.enum(["outbound", "return", "inter_island", "other"]).default("outbound"),
          airline: z.string().optional(),
          flightNumber: z.string().optional(),
          departureAirport: z.string().max(8).optional(),
          arrivalAirport: z.string().max(8).optional(),
          departureCity: z.string().optional(),
          arrivalCity: z.string().optional(),
          date: z.string().optional(),
          departureTime: z.string().optional(),
          arrivalTime: z.string().optional(),
          confirmationCode: z.string().optional(),
          seatInfo: z.string().optional(),
          price: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "planner");
        const id = await addFlight({
          ...input,
          userId: ctx.user.id,
          sortOrder: 0,
          price: input.price != null ? String(input.price) : undefined,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          leg: z.enum(["outbound", "return", "inter_island", "other"]).optional(),
          airline: z.string().optional(),
          flightNumber: z.string().optional(),
          departureAirport: z.string().max(8).optional(),
          arrivalAirport: z.string().max(8).optional(),
          departureCity: z.string().optional(),
          arrivalCity: z.string().optional(),
          date: z.string().optional(),
          departureTime: z.string().optional(),
          arrivalTime: z.string().optional(),
          confirmationCode: z.string().optional(),
          seatInfo: z.string().optional(),
          price: z.number().nullable().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateFlight(id, data as any);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFlight(input.id);
        return { success: true };
      }),
  }),

  // ─── Schedule / Day Builder ─────────────────────────────────────────────────
  schedule: router({
    /**
     * Returns all master itinerary items for a trip, grouped by day.
     * Day 0 = unscheduled. Days 1..N = trip days in order.
     * Also returns trip date range so the UI can label each day.
     */
    getDays: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        const items = await getItineraryItems(input.tripId, null, true);
        const trip = await getTripById(input.tripId);

        // Build trip day list from startDate → endDate
        const days: { dayNumber: number; date: string | null; label: string | null; island: string | null }[] = [];
        if (trip?.startDate && trip?.endDate) {
          const start = new Date(trip.startDate);
          const end = new Date(trip.endDate);
          let current = new Date(start);
          let dayNum = 1;
          while (current <= end) {
            days.push({
              dayNumber: dayNum,
              date: current.toISOString().split("T")[0],
              label: null,
              island: null,
            });
            current.setDate(current.getDate() + 1);
            dayNum++;
          }
        }

        // Collect custom day labels from items
        const labelMap: Record<number, string> = {};
        for (const item of items) {
          if (item.scheduledDay && item.dayLabel) {
            labelMap[item.scheduledDay] = item.dayLabel;
          }
        }
        days.forEach((d) => {
          if (labelMap[d.dayNumber]) d.label = labelMap[d.dayNumber];
        });

        // Assign islands to days based on trip islands array
        const islands = (trip?.islands as string[]) ?? [];
        if (islands.length === 2 && days.length > 0) {
          // Split days roughly in half between the two islands
          const half = Math.floor(days.length / 2);
          days.forEach((d, i) => {
            d.island = i < half ? islands[0] : islands[1];
          });
        } else if (islands.length === 1) {
          days.forEach((d) => (d.island = islands[0]));
        }

        return {
          days,
          items: items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            location: item.location,
            island: item.island,
            category: item.category,
            timeOfDay: item.timeOfDay,
            priceRange: item.priceRange,
            estimatedCost: item.estimatedCost ? parseFloat(item.estimatedCost as unknown as string) : null,
            url: item.url,
            scheduledDay: item.scheduledDay ?? null,
            scheduledTime: item.scheduledTime ?? null,
            dayLabel: item.dayLabel ?? null,
            sortOrder: item.sortOrder,
          })),
          tripStartDate: trip?.startDate ?? null,
          tripEndDate: trip?.endDate ?? null,
        };
      }),

    /** Assign an item to a specific day and optional time */
    assign: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        tripId: z.number(),
        scheduledDay: z.number().nullable(),
        scheduledTime: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "planner");
        await updateItineraryItem(input.itemId, {
          scheduledDay: input.scheduledDay ?? undefined,
          scheduledTime: input.scheduledTime ?? undefined,
        });
        return { success: true };
      }),

    /** Remove an item from its scheduled day (move back to unscheduled pool) */
    unschedule: protectedProcedure
      .input(z.object({ itemId: z.number(), tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "planner");
        // Set scheduledDay and scheduledTime to null via raw update
        const db = await (await import("./db")).getDb();
        if (db) {
          const { itineraryItems } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(itineraryItems)
            .set({ scheduledDay: null, scheduledTime: null })
            .where(eq(itineraryItems.id, input.itemId));
        }
        return { success: true };
      }),

    /** Update the custom label for a day (e.g. "North Shore Adventure") */
    updateDayLabel: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        dayNumber: z.number(),
        label: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id, "planner");
        // Update all items on this day to carry the new label
        const db = await (await import("./db")).getDb();
        if (db) {
          const { itineraryItems } = await import("../drizzle/schema");
          const { eq, and } = await import("drizzle-orm");
          await db.update(itineraryItems)
            .set({ dayLabel: input.label })
            .where(and(
              eq(itineraryItems.tripId, input.tripId),
              eq(itineraryItems.scheduledDay, input.dayNumber)
            ));
        }
        return { success: true };
      }),
  }),

  // ─── Map Data ───────────────────────────────────────────────────────────────
  map: router({
    /** Returns all master itinerary items with location data for map plotting */
    items: protectedProcedure
      .input(z.object({ tripId: z.number(), island: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        await assertTripAccess(input.tripId, ctx.user.id);
        const allItems = await getItineraryItems(input.tripId, null, true);
        const filtered = input.island
          ? allItems.filter((item) => item.island === input.island)
          : allItems;
        return filtered.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          location: item.location,
          island: item.island,
          category: item.category,
          url: item.url,
          priceRange: item.priceRange,
          timeOfDay: item.timeOfDay,
        }));
      }),
  }),

  // ─── Admin: Change Requests ──────────────────────────────────────────────────────
  feedback: router({
    /** Submit a new change request (any authenticated user) */
    submit: protectedProcedure
      .input(z.object({
        title: z.string().min(3).max(256),
        description: z.string().min(5),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        category: z.enum(["bug", "feature", "improvement", "question"]).default("feature"),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createChangeRequest({
          userId: ctx.user.id,
          userName: ctx.user.name ?? undefined,
          title: input.title,
          description: input.description,
          priority: input.priority,
          category: input.category,
        });
        return { id };
      }),

    /** List all change requests — admin only */
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return getChangeRequests();
      }),

    /** Update status or add admin notes — admin only */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in-progress", "done", "wont-do"]).optional(),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        await updateChangeRequest(input.id, {
          status: input.status,
          adminNotes: input.adminNotes,
        });
        return { success: true };
      }),

     /** List only the current user's own submissions */
    myList: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserChangeRequests(ctx.user.id);
      }),
  }),

  // ─── Profile ─────────────────────────────────────────────────────────────────
  profile: router({
    /** Get the current user's profile */
    me: protectedProcedure.query(async ({ ctx }) => {
      const db = await (await import("drizzle-orm/mysql2")).drizzle(process.env.DATABASE_URL!);
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return rows[0] ?? null;
    }),

    /** Set or update the current user's display name */
    setDisplayName: protectedProcedure
      .input(z.object({ displayName: z.string().min(1).max(64).trim() }))
      .mutation(async ({ ctx, input }) => {
        const db = await (await import("drizzle-orm/mysql2")).drizzle(process.env.DATABASE_URL!);
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(users)
          .set({ displayName: input.displayName, hasChosenName: true })
          .where(eq(users.id, ctx.user.id));
        return { success: true, displayName: input.displayName };
      }),
  }),

  // ─── Admin User Management ────────────────────────────────────────────────────
  adminUsers: router({
    /** List all users — admin only */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await (await import("drizzle-orm/mysql2")).drizzle(process.env.DATABASE_URL!);
      const { users } = await import("../drizzle/schema");
      const rows = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: users.displayName,
        role: users.role,
        hasChosenName: users.hasChosenName,
        hasSeenWelcome: users.hasSeenWelcome,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users).orderBy(users.createdAt);
      return rows;
    }),

    /** Update a user's displayName and/or role — admin only */
    update: protectedProcedure
      .input(z.object({
        userId: z.number(),
        displayName: z.string().min(1).max(64).trim().optional(),
        role: z.enum(["user", "admin"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await (await import("drizzle-orm/mysql2")).drizzle(process.env.DATABASE_URL!);
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updateData: Record<string, unknown> = {};
        if (input.displayName !== undefined) {
          updateData.displayName = input.displayName;
          updateData.hasChosenName = true;
        }
        if (input.role !== undefined) updateData.role = input.role;
        if (Object.keys(updateData).length === 0) return { success: true };
        await db.update(users).set(updateData).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // ─── Trip Notes ────────────────────────────────────────────────────────────
  notes: router({
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        const { getTripNotes } = await import("./db");
        return getTripNotes(input.tripId);
      }),

    add: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        category: z.enum(["general", "packing_list", "reminder", "tip", "journal"]),
        title: z.string().min(1).max(255),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { addTripNote } = await import("./db");
        const { broadcastToTrip } = await import("./sse");
        const authorName = (ctx.user as any).displayName || ctx.user.name || "Traveler";
        const id = await addTripNote({
          tripId: input.tripId,
          userId: ctx.user.id,
          authorName,
          category: input.category,
          title: input.title,
          content: input.content,
        });
        // Broadcast to all other connected members of this trip
        broadcastToTrip({
          type: "note_added",
          tripId: input.tripId,
          noteId: id,
          authorId: ctx.user.id,
          authorName,
          title: input.title,
          category: input.category,
          content: input.content.slice(0, 120),
          timestamp: new Date().toISOString(),
        }, ctx.user.id);
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        tripId: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).optional(),
        category: z.enum(["general", "packing_list", "reminder", "tip", "journal"]).optional(),
        isPinned: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateTripNote } = await import("./db");
        const { broadcastToTrip } = await import("./sse");
        const { id, tripId, ...data } = input;
        await updateTripNote(id, data);
        const authorName = (ctx.user as any).displayName || ctx.user.name || "Traveler";
        broadcastToTrip({
          type: "note_updated",
          tripId,
          noteId: id,
          authorId: ctx.user.id,
          authorName,
          title: input.title,
          category: input.category,
          timestamp: new Date().toISOString(),
        }, ctx.user.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteTripNote } = await import("./db");
        const { broadcastToTrip } = await import("./sse");
        await deleteTripNote(input.id);
        const authorName = (ctx.user as any).displayName || ctx.user.name || "Traveler";
        broadcastToTrip({
          type: "note_deleted",
          tripId: input.tripId,
          noteId: input.id,
          authorId: ctx.user.id,
          authorName,
          timestamp: new Date().toISOString(),
        }, ctx.user.id);
        return { success: true };
      }),

    togglePin: protectedProcedure
      .input(z.object({ id: z.number(), isPinned: z.boolean() }))
      .mutation(async ({ input }) => {
        const { updateTripNote } = await import("./db");
        await updateTripNote(input.id, { isPinned: input.isPinned });
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
