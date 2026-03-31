import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createTrip,
  getTripsByUser,
  getTripById,
  updateTrip,
  deleteTrip,
  addChatMessage,
  getChatMessages,
  clearChatMessages,
  addItineraryItem,
  getItineraryItems,
  updateItineraryItem,
  deleteItineraryItem,
  saveSearchResults,
  getSearchResults,
} from "./db";
import { chatWithAgent, extractTripData, searchForRecommendations, DESTINATION_CONFIGS } from "./agent";

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
        const trip = await getTripById(input.id);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
        return trip;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          destination: z.string().min(1),
          destinationKey: z.string().default("hawaii"),
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
        const trip = await getTripById(input.id);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
        const { id, ...data } = input;
        await updateTrip(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const trip = await getTripById(input.id);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
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

  // ─── Chat ────────────────────────────────────────────────────────────────────
  chat: router({
    messages: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
        return getChatMessages(input.tripId);
      }),

    send: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");

        // Save user message
        await addChatMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
          role: "user",
          content: input.message,
        });

        // Get conversation history
        const history = await getChatMessages(input.tripId, 30);

        // Get AI response
        const aiResponse = await chatWithAgent(trip, history, input.message);

        // Save AI response
        const aiMsgId = await addChatMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
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

        return {
          id: aiMsgId,
          content: aiResponse,
          role: "assistant" as const,
          tripUpdates: extracted,
        };
      }),

    initWelcome: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");

        const existingMessages = await getChatMessages(input.tripId, 1);
        if (existingMessages.length > 0) {
          return { alreadyInitialized: true };
        }

        const config = DESTINATION_CONFIGS[trip.destinationKey] || DESTINATION_CONFIGS.hawaii;
        const welcomeMessage = config.greeting + `\n\nTo get started, could you tell me **when you're planning to travel**? Even rough dates are helpful — we can always adjust later!`;

        await addChatMessage({
          tripId: input.tripId,
          userId: ctx.user.id,
          role: "assistant",
          content: welcomeMessage,
        });

        return { alreadyInitialized: false, message: welcomeMessage };
      }),

    clear: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
        await clearChatMessages(input.tripId);
        return { success: true };
      }),
  }),

  // ─── Itinerary ───────────────────────────────────────────────────────────────
  itinerary: router({
    list: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ ctx, input }) => {
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
        return getItineraryItems(input.tripId);
      }),

    add: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
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
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
        const id = await addItineraryItem({
          ...input,
          userId: ctx.user.id,
          isSaved: true,
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
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");

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
        const trip = await getTripById(input.tripId);
        if (!trip || trip.userId !== ctx.user.id) throw new Error("Trip not found");
        return getSearchResults(input.tripId, input.category, input.island);
      }),
  }),
});

export type AppRouter = typeof appRouter;
