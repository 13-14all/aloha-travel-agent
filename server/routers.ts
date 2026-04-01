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
    me: publicProcedure.query((opts) => opts.ctx.user),
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
});

export type AppRouter = typeof appRouter;
