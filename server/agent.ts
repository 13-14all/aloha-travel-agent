import { invokeLLM } from "./_core/llm";
import { Trip, ChatMessage, SearchResultItem } from "../drizzle/schema";

// ─── Destination Configs ──────────────────────────────────────────────────────

export const DESTINATION_CONFIGS: Record<string, {
  name: string;
  mascot: string;
  mascotEmoji: string;
  islands: string[];
  greeting: string;
  searchTerms: string[];
}> = {
  hawaii: {
    name: "Hawaii",
    mascot: "hula_dancer",
    mascotEmoji: "🌺",
    islands: ["Oahu", "Big Island (Hawaii)", "Maui", "Kauai", "Molokai", "Lanai"],
    greeting: "Aloha! I'm Lei, your personal Hawaii travel agent! 🌺 I'm so excited to help you plan an unforgettable Hawaiian adventure. Whether it's the vibrant shores of Oahu or the volcanic wonders of the Big Island, I'll help you discover the very best of the Aloha State.",
    searchTerms: ["Hawaii", "Hawaiian Islands"],
  },
  scotland: {
    name: "Scotland",
    mascot: "highlander",
    mascotEmoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    islands: ["Mainland", "Isle of Skye", "Orkney", "Shetland", "Hebrides"],
    greeting: "Och aye! I'm Angus, your Scottish Highland travel guide! 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Ready to explore misty glens, ancient castles, and the finest whisky in the world? Let's plan your Scottish adventure!",
    searchTerms: ["Scotland", "Scottish Highlands"],
  },
  italy: {
    name: "Italy",
    mascot: "gondolier",
    mascotEmoji: "🍕",
    islands: ["Sicily", "Sardinia", "Capri", "Ischia"],
    greeting: "Benvenuti! I'm Marco, your Italian travel companion! 🍕 From the rolling hills of Tuscany to the canals of Venice, let's plan your perfect Italian escape!",
    searchTerms: ["Italy", "Italian"],
  },
  japan: {
    name: "Japan",
    mascot: "geisha",
    mascotEmoji: "🌸",
    islands: ["Honshu", "Hokkaido", "Kyushu", "Shikoku", "Okinawa"],
    greeting: "Konnichiwa! I'm Sakura, your Japan travel guide! 🌸 From ancient temples to futuristic cities, let's discover the wonders of Japan together!",
    searchTerms: ["Japan", "Japanese"],
  },
};

// ─── Planning Stage Prompts ───────────────────────────────────────────────────

export const STAGE_PROMPTS: Record<string, string> = {
  welcome: `You are currently in the WELCOME stage. Your goal is to warmly greet the travelers and ask them about their travel dates. Be warm, enthusiastic, and friendly. Ask: "When are you planning to travel? What dates work best for you?"`,

  dates: `You are currently in the DATES stage. The user is providing travel dates. Help them confirm their dates and then ask about which islands they'd like to visit. For Hawaii, suggest starting with Oahu (1 week) then the Big Island (1 week) as a great combination. Ask them to confirm or modify this plan.`,

  islands: `You are currently in the ISLANDS stage. The user is selecting which islands to visit. Help them understand the character of each island and confirm their selection. Then ask about their overall budget for the trip (flights, lodging, activities, food combined). Give them budget ranges to choose from: Budget ($3,000-5,000), Moderate ($5,000-10,000), Comfortable ($10,000-15,000), Luxury ($15,000+).`,

  budget: `You are currently in the BUDGET stage. The user is sharing their budget. Acknowledge it and explain how you'll use it to find the best options. Then transition to activities - ask what kinds of experiences they're most excited about: adventure activities, cultural experiences, relaxing beaches, food and dining, nature and wildlife, or a mix of everything.`,

  activities: `You are currently in the ACTIVITIES stage. Help the user discover amazing activities for each island they're visiting. You have access to web search to find current, highly-rated activities. Focus on unique, authentic experiences - not just tourist traps. Ask about their interests and search for the best matches. When you've gathered enough activity ideas, suggest moving to lodging planning.`,

  lodging: `You are currently in the LODGING stage. Help find the perfect places to stay. Search broadly - hotels, resorts, Airbnb, vacation rentals, and unique alternatives. Look for interesting and unique places, not just standard hotels. Consider Facebook Marketplace and Craigslist for unique local rentals. Ask about their preferences: resort vs. condo vs. unique stay, location preferences, must-have amenities.`,

  transportation: `You are currently in the TRANSPORTATION stage. Help plan getting around. Cover: flights to Hawaii (suggest checking Google Flights, Kayak, Scott's Cheap Flights), inter-island flights if visiting multiple islands, rental cars on each island, and any specific transportation needs. Ask about their home airport and preferred airlines.`,

  summary: `You are currently in the SUMMARY stage. Provide a beautiful, organized summary of everything planned: dates, islands, budget, top activities for each island, lodging options, and transportation plan. Congratulate them on their upcoming adventure and offer to refine any part of the plan.`,
};

// ─── Build System Prompt ──────────────────────────────────────────────────────

export function buildSystemPrompt(trip: Trip): string {
  const config = DESTINATION_CONFIGS[trip.destinationKey] || DESTINATION_CONFIGS.hawaii;
  const stagePrompt = STAGE_PROMPTS[trip.planningStage] || STAGE_PROMPTS.welcome;

  const tripContext = `
CURRENT TRIP CONTEXT:
- Destination: ${trip.destination}
- Planning Stage: ${trip.planningStage}
- Travel Dates: ${trip.startDate && trip.endDate ? `${trip.startDate} to ${trip.endDate}` : "Not yet set"}
- Selected Islands: ${trip.islands && (trip.islands as string[]).length > 0 ? (trip.islands as string[]).join(", ") : "Not yet selected"}
- Budget Range: ${trip.budgetMin && trip.budgetMax ? `$${trip.budgetMin.toLocaleString()} - $${trip.budgetMax.toLocaleString()}` : "Not yet set"}
- Number of Guests: ${trip.guestCount || 2}
- Guest Names: ${trip.guestNames && (trip.guestNames as string[]).length > 0 ? (trip.guestNames as string[]).join(", ") : "Not specified"}
`;

  return `You are ${config.mascotEmoji} a warm, knowledgeable, and enthusiastic personal travel agent specializing in ${config.name} travel. Your name matches the destination theme. You are helping plan a real trip.

PERSONALITY:
- Warm, friendly, and encouraging — like a knowledgeable friend who loves travel
- Use simple, clear language — this app is used by people of all ages including elderly users
- Be specific and helpful with real recommendations, not generic advice
- Show genuine excitement about the destination
- Keep responses focused and not too long — elderly users appreciate clarity
- Use occasional relevant emojis to make responses feel friendly and visual

${tripContext}

CURRENT STAGE INSTRUCTIONS:
${stagePrompt}

IMPORTANT GUIDELINES:
1. Always stay on-task for the current planning stage
2. When users provide information (dates, budget, etc.), acknowledge it warmly and confirm you've noted it
3. When searching for activities or lodging, be specific — mention real places, real experiences
4. Emphasize UNIQUE and AUTHENTIC experiences over generic tourist options
5. For lodging, actively suggest checking Airbnb, VRBO, Facebook Marketplace, and Craigslist for unique local stays
6. Keep responses conversational and easy to read — use short paragraphs
7. After collecting key information, suggest moving to the next planning stage
8. If the user asks about something outside the current stage, help them but gently guide back

When you have search results to share, format them clearly with:
- **Name** of the place/activity
- Brief description (1-2 sentences)
- Why it's special or unique
- Approximate cost if known`;
}

// ─── AI Search for Activities/Lodging ────────────────────────────────────────

export async function searchForRecommendations(
  category: "activity" | "lodging" | "restaurant" | "transportation",
  island: string,
  destination: string,
  budget?: string,
  preferences?: string
): Promise<SearchResultItem[]> {
  const budgetContext = budget ? `Budget range: ${budget}.` : "";
  const prefContext = preferences ? `User preferences: ${preferences}.` : "";

  const prompts: Record<string, string> = {
    activity: `Search and recommend the top 8 unique activities and experiences on ${island}, ${destination}. Focus on authentic, memorable experiences that go beyond typical tourist activities. Include adventure activities, cultural experiences, natural wonders, and local favorites. ${budgetContext} ${prefContext}`,
    lodging: `Search and recommend 8 diverse lodging options on ${island}, ${destination}. Include a mix of: unique vacation rentals, boutique hotels, resorts, and interesting local stays. Specifically look for options that might be found on Airbnb, VRBO, or local rental sites. Emphasize character and uniqueness over standard hotel chains. ${budgetContext} ${prefContext}`,
    restaurant: `Search and recommend the top 8 dining experiences on ${island}, ${destination}. Focus on local favorites, hidden gems, and authentic cuisine. Include a mix of price ranges and meal types. ${budgetContext} ${prefContext}`,
    transportation: `Provide transportation options and tips for ${island}, ${destination}. Include rental car recommendations, shuttle services, and any unique transportation options. ${budgetContext}`,
  };

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a travel research expert. Return a JSON array of exactly 8 recommendations. Each item must have: title (string), description (string, 2-3 sentences), location (string), priceRange (string like "$50-100/night" or "$25/person"), tags (array of 3-5 strings), source (string like "Airbnb", "TripAdvisor", "Local recommendation", etc.), and a rating (number 1-5). Be specific with real place names and accurate information.`,
      },
      {
        role: "user",
        content: prompts[category],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  location: { type: "string" },
                  priceRange: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  source: { type: "string" },
                  rating: { type: "number" },
                },
                required: ["title", "description", "location", "priceRange", "tags", "source", "rating"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : null;
    if (!content) return [];
    const parsed = JSON.parse(content);
    return parsed.items || [];
  } catch {
    return [];
  }
}

// ─── Chat with AI ─────────────────────────────────────────────────────────────

export async function chatWithAgent(
  trip: Trip,
  messages: ChatMessage[],
  userMessage: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(trip);

  // Build conversation history (last 20 messages for context)
  const history = messages.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content;
  return (typeof content === 'string' ? content : null) || "I'm sorry, I had trouble responding. Please try again!";
}

// ─── Extract Trip Data from Conversation ─────────────────────────────────────

export async function extractTripData(
  conversation: string,
  currentTrip: Trip
): Promise<Partial<Trip>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a data extraction assistant. Extract travel planning information from the conversation and return it as JSON. Only include fields that are clearly mentioned or confirmed in the conversation.`,
      },
      {
        role: "user",
        content: `Extract trip planning data from this conversation:\n\n${conversation}\n\nCurrent trip data: ${JSON.stringify({
          startDate: currentTrip.startDate,
          endDate: currentTrip.endDate,
          islands: currentTrip.islands,
          budgetMin: currentTrip.budgetMin,
          budgetMax: currentTrip.budgetMax,
          guestCount: currentTrip.guestCount,
          planningStage: currentTrip.planningStage,
        })}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trip_data",
        strict: true,
        schema: {
          type: "object",
          properties: {
            startDate: { type: "string" },
            endDate: { type: "string" },
            islands: { type: "array", items: { type: "string" } },
            budgetMin: { type: "number" },
            budgetMax: { type: "number" },
            guestCount: { type: "number" },
            planningStage: {
              type: "string",
              enum: ["welcome", "dates", "islands", "budget", "activities", "lodging", "transportation", "summary"],
            },
          },
          required: [],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : null;
    if (!content) return {};
    return JSON.parse(content);
  } catch {
    return {};
  }
}
