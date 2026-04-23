/**
 * HowItWorks.tsx
 *
 * The quick-reference help page for Aloha Travel Agent.
 * - Opens automatically on first visit (localStorage flag)
 * - Accessible from a persistent "?" button on every page
 * - Designed for large, easy-to-read text — elderly-friendly
 * - Structured in clearly labeled sections so it's easy to update
 *   as new features are added to the app
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  DollarSign,
  Plane,
  Map,
  CalendarDays,
  GitMerge,
  Search,
  List,
  Star,
  HelpCircle,
  Printer,
  X,
  CheckCircle2,
} from "lucide-react";

// ─── Section data — update this array when new features are added ─────────────

const SECTIONS = [
  {
    id: "welcome",
    icon: <Star className="w-7 h-7 text-yellow-500" />,
    title: "Welcome to Aloha Travel Agent",
    color: "from-yellow-50 to-amber-50 border-yellow-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          <strong>Aloha Travel Agent</strong> is your personal AI-powered trip planner, designed for the whole family — including grandparents and grandkids. It guides you step by step through planning any trip, from choosing activities to booking lodging and organizing your daily schedule.
        </p>
        <p>
          Your AI guide is named <strong>Leilani</strong> 🌺 for Hawaii trips. She changes personality for every destination — a Scottish Highlander for Scotland, a Roman for Italy, and so on.
        </p>
        <p>
          You can plan trips together as a family, with each person contributing their own ideas, and then combine everything into one final itinerary.
        </p>
      </div>
    ),
  },
  {
    id: "getting-started",
    icon: <CheckCircle2 className="w-7 h-7 text-emerald-500" />,
    title: "Getting Started — Your First Trip",
    color: "from-emerald-50 to-green-50 border-emerald-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          From the home screen, click <strong>"+ New Trip"</strong> or the pre-built <strong>"Plan My Hawaii Trip"</strong> button. This creates your trip and opens the planning workspace.
        </p>
        <p>
          The workspace has several tabs across the top — <strong>Chat, Search, Itinerary, Family, Flights, Map, Day Schedule,</strong> and <strong>Merge &amp; Finalize</strong>. You'll use them in roughly that order as your trip comes together.
        </p>
        <p>
          On the right side of the screen you'll always see a summary of your trip details and a budget tracker so you know where you stand at a glance.
        </p>
      </div>
    ),
  },
  {
    id: "chat",
    icon: <MessageSquare className="w-7 h-7 text-primary" />,
    title: "Chatting with Leilani",
    color: "from-blue-50 to-sky-50 border-blue-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Chat tab</strong> is where you talk with Leilani. Just type (or speak, if voice is enabled) and she will guide you through the planning process one step at a time.
        </p>
        <p>
          She will ask you about your <strong>travel dates, which islands to visit, and your rough budget</strong>. After that she moves on to activities, lodging, dining, and transportation — in whatever order you prefer.
        </p>
        <p>
          You can also just chat freely — ask questions, share ideas, or say "let's focus on restaurants first." Leilani is flexible and remembers everything you've told her for this trip.
        </p>
        <p>
          <strong>Quick-reply buttons</strong> appear below her messages so you can respond with one tap instead of typing.
        </p>
      </div>
    ),
  },
  {
    id: "planning-paths",
    icon: <Search className="w-7 h-7 text-violet-500" />,
    title: "Planning Paths — Activities First or Lodging First",
    color: "from-violet-50 to-purple-50 border-violet-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          Every family member can choose their own <strong>planning path</strong> — the order in which they want to plan things.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          <div className="bg-white border border-violet-200 rounded-xl p-4">
            <p className="font-bold text-violet-700 mb-1">🏄 Activities First</p>
            <p className="text-base">Start with what you want to do, then find lodging and transport around those activities. Great for adventurous planners.</p>
          </div>
          <div className="bg-white border border-blue-200 rounded-xl p-4">
            <p className="font-bold text-blue-700 mb-1">🏨 Lodging First</p>
            <p className="text-base">Find where you want to stay first, then plan activities and dining around your home base. Great for comfort-focused planners.</p>
          </div>
        </div>
        <p>
          Each person's chat with Leilani follows their chosen path automatically.
        </p>
      </div>
    ),
  },
  {
    id: "search",
    icon: <Search className="w-7 h-7 text-orange-500" />,
    title: "Search & Discover",
    color: "from-orange-50 to-amber-50 border-orange-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Search &amp; Discover tab</strong> lets you ask Leilani to search the web for specific things — activities on Oahu, unique places to stay on the Big Island, great restaurants, and more.
        </p>
        <p>
          She searches broadly and returns results as cards. Each card shows the name, description, location, and a link to learn more. Click <strong>"Save to Itinerary"</strong> on any card to add it to your personal list.
        </p>
        <p>
          She looks across hotels, Airbnb, and also unique options like local rentals and interesting experiences you might not find on the big booking sites.
        </p>
      </div>
    ),
  },
  {
    id: "itinerary",
    icon: <List className="w-7 h-7 text-teal-500" />,
    title: "My Itinerary",
    color: "from-teal-50 to-cyan-50 border-teal-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>My Itinerary tab</strong> shows everything you've personally saved — activities, lodging, restaurants, and transportation options — organized by island and category.
        </p>
        <p>
          You can remove items, add notes, and set estimated costs for each item. This is your personal wish list before the group finalizes the trip together.
        </p>
      </div>
    ),
  },
  {
    id: "family",
    icon: <Users className="w-7 h-7 text-pink-500" />,
    title: "Family Members & Roles",
    color: "from-pink-50 to-rose-50 border-pink-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Family tab</strong> is where you manage who is part of the trip. There are three roles:
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-3 bg-white border border-yellow-200 rounded-xl p-3">
            <span className="text-2xl">👑</span>
            <div>
              <p className="font-bold">Owner</p>
              <p className="text-base">Full control — can add/remove members, change roles, and finalize the itinerary. Currently Alex and Tami.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white border border-blue-200 rounded-xl p-3">
            <span className="text-2xl">✏️</span>
            <div>
              <p className="font-bold">Planner</p>
              <p className="text-base">Can chat with Leilani, save items, and contribute to the trip. Great for adult family members.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3">
            <span className="text-2xl">👀</span>
            <div>
              <p className="font-bold">Viewer</p>
              <p className="text-base">Can see the trip but cannot make changes. Perfect for grandkids or anyone you want to keep informed.</p>
            </div>
          </div>
        </div>
        <p>
          To invite someone, click <strong>"Invite Member"</strong>, choose their role, and copy the invite link to send them. They click the link, enter their name, and join the trip.
        </p>
      </div>
    ),
  },
  {
    id: "budget",
    icon: <DollarSign className="w-7 h-7 text-emerald-600" />,
    title: "Budget Tracker",
    color: "from-emerald-50 to-green-50 border-emerald-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Budget Tracker</strong> lives in the right sidebar of every trip. It shows a color-coded progress bar:
        </p>
        <div className="grid grid-cols-3 gap-3 text-center text-base">
          <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-3">
            <p className="text-2xl mb-1">🟢</p>
            <p className="font-semibold">Green</p>
            <p>Under 75% of budget used — you're on track</p>
          </div>
          <div className="bg-amber-100 border border-amber-300 rounded-xl p-3">
            <p className="text-2xl mb-1">🟡</p>
            <p className="font-semibold">Amber</p>
            <p>75%+ used — getting close to the limit</p>
          </div>
          <div className="bg-red-100 border border-red-300 rounded-xl p-3">
            <p className="text-2xl mb-1">🔴</p>
            <p className="font-semibold">Red</p>
            <p>Over budget — time to review your selections</p>
          </div>
        </div>
        <p>
          Click <strong>"Edit costs"</strong> to add an estimated dollar amount to any item in your Master Itinerary. The tracker updates instantly.
        </p>
      </div>
    ),
  },
  {
    id: "flights",
    icon: <Plane className="w-7 h-7 text-sky-500" />,
    title: "Flights",
    color: "from-sky-50 to-blue-50 border-sky-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Flights tab</strong> is where you log your flight details. Add your outbound flight, any inter-island flights (for example Oahu to Big Island), and your return flight home.
        </p>
        <p>
          For each flight you can record the airline, flight number, departure and arrival airports, times, confirmation code, seat information, and estimated cost. All flights appear in a timeline sorted by date and time.
        </p>
        <p>
          Flights are included in the PDF export so your complete travel schedule — including air travel — is in one document.
        </p>
      </div>
    ),
  },
  {
    id: "map",
    icon: <Map className="w-7 h-7 text-indigo-500" />,
    title: "Island Map",
    color: "from-indigo-50 to-violet-50 border-indigo-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Island Map tab</strong> shows an interactive map with all your saved Master Itinerary items plotted as colored pins:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-base text-center">
          {[
            { color: "bg-emerald-500", label: "🤿 Activities" },
            { color: "bg-blue-500", label: "🏨 Lodging" },
            { color: "bg-orange-500", label: "🍽️ Dining" },
            { color: "bg-purple-500", label: "🚌 Transport" },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-border rounded-xl p-2">
              <div className={`w-4 h-4 rounded-full ${m.color} mx-auto mb-1`} />
              <p>{m.label}</p>
            </div>
          ))}
        </div>
        <p>
          Use the island selector at the top to switch between Oahu and Big Island views. Click any pin to see the item's details and a link to learn more.
        </p>
      </div>
    ),
  },
  {
    id: "schedule",
    icon: <CalendarDays className="w-7 h-7 text-rose-500" />,
    title: "Day-by-Day Schedule",
    color: "from-rose-50 to-pink-50 border-rose-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Day Schedule tab</strong> is where your trip comes together into a day-by-day plan. Once your travel dates are set, a column appears for each day of the trip — automatically labeled with the date and island.
        </p>
        <p>
          Items from your Master Itinerary appear in the <strong>Unscheduled pool</strong> at the bottom. Click the arrow on any item, choose which day and what time, and it moves into that day's column.
        </p>
        <p>
          You can give each day a custom name — for example <em>"North Shore Adventure"</em> or <em>"Volcano Day."</em> Each day also shows its estimated total cost.
        </p>
        <p>
          Use the <strong>Previous / Next</strong> buttons to navigate through all 14 days (or however long your trip is).
        </p>
      </div>
    ),
  },
  {
    id: "merge",
    icon: <GitMerge className="w-7 h-7 text-amber-600" />,
    title: "Merge & Finalize",
    color: "from-amber-50 to-yellow-50 border-amber-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <p>
          The <strong>Merge &amp; Finalize tab</strong> is the last step. It shows all the items that every family member has saved, side by side. You can see who saved what and vote on favorites with a thumbs-up.
        </p>
        <p>
          As the trip owner, you click <strong>"Add to Master"</strong> on the items you want to keep. These become the official Master Itinerary that everyone can see.
        </p>
        <p>
          Once the Master Itinerary looks good, click <strong>"Export PDF"</strong> to download a beautifully formatted, print-ready document with all the details — great for printing and handing to family members who prefer paper.
        </p>
      </div>
    ),
  },
  {
    id: "tips",
    icon: <HelpCircle className="w-7 h-7 text-gray-500" />,
    title: "Tips for Easy Use",
    color: "from-gray-50 to-slate-50 border-gray-200",
    content: (
      <div className="space-y-3 text-lg leading-relaxed text-foreground">
        <ul className="space-y-3 list-none">
          {[
            "Your trip is saved automatically — you can close the browser and come back later and everything will be exactly where you left it.",
            "If you're not sure what to do next, just go to the Chat tab and ask Leilani — she will guide you.",
            "The sidebar on the right always shows your trip summary and budget so you never lose track of where you are.",
            "All buttons are large and clearly labeled. If something is not available to you (like editing as a Viewer), it will simply not appear.",
            "To print this help page, click the Print button at the top of this page.",
            "If you want to suggest a change or report a problem, look for the 'Suggest a Change' button in the top navigation — it opens a separate window so you never lose your place.",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HowItWorks() {
  // Mark first visit as done so the auto-open only happens once
  useEffect(() => {
    localStorage.setItem("aloha_help_seen", "true");
  }, []);

  const isPopup = window.opener !== null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌺</span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">How This Works</h1>
              <p className="text-sm text-muted-foreground">Your quick reference guide to Aloha Travel Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 h-10 text-base hidden sm:flex"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            {isPopup && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.close()}
                className="gap-2 h-10 text-base"
              >
                <X className="w-4 h-4" />
                Close
              </Button>
            )}
            {!isPopup && (
              <Button
                variant="default"
                size="sm"
                onClick={() => window.history.back()}
                className="gap-2 h-10 text-base"
              >
                ← Back
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table of contents ── */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-card border border-border rounded-2xl p-5 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-3">Jump to a section:</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-base text-primary hover:underline py-1"
              >
                <span className="scale-75">{s.icon}</span>
                {s.title.split(" — ")[0].replace("Getting Started", "Getting Started")}
              </a>
            ))}
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={`bg-gradient-to-br ${section.color} border rounded-2xl overflow-hidden`}
            >
              <div className="px-6 py-5 border-b border-current/10 flex items-center gap-3">
                {section.icon}
                <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
              </div>
              <div className="px-6 py-5">{section.content}</div>
            </section>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-10 text-center py-6 border-t border-border">
          <p className="text-base text-muted-foreground">
            🌺 Aloha Travel Agent — Your Personal AI Trip Planner
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This guide is updated automatically as new features are added.
          </p>
        </div>
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .sticky { position: static; }
          button { display: none !important; }
          section { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

// ─── Hook: auto-open on first visit ──────────────────────────────────────────

export function useFirstRunHelp() {
  useEffect(() => {
    const seen = localStorage.getItem("aloha_help_seen");
    if (!seen) {
      // Small delay so the main app renders first
      const timer = setTimeout(() => {
        window.open("/help", "aloha_help", "width=900,height=750,scrollbars=yes,resizable=yes");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);
}
