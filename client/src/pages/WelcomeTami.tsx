/**
 * WelcomeTami.tsx
 *
 * Personalized first-login welcome page for Tami.
 * Shows once on first sign-in, then never again (tracked via DB flag).
 * Placeholder content — Alex will provide the real message later.
 */

import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function WelcomeTami() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const markWelcomed = trpc.auth.markWelcomed.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate("/");
    },
  });

  const handleStart = () => {
    markWelcomed.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">

        {/* Floating hibiscus decorations */}
        <div className="text-center mb-2 text-5xl animate-bounce">🌺</div>

        {/* Main card */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl overflow-hidden border border-rose-100">

          {/* Tropical header banner */}
          <div
            className="h-3 w-full"
            style={{ background: "linear-gradient(90deg, #f43f5e, #fb923c, #fbbf24, #34d399, #38bdf8, #818cf8, #f43f5e)" }}
          />

          <div className="px-8 py-10 sm:px-12 sm:py-14 text-center space-y-8">

            {/* Mascot */}
            <div className="flex justify-center">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-lg border-4 border-white"
                style={{ background: "linear-gradient(135deg, #fde68a, #fb923c)" }}
              >
                💐
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1
                className="text-4xl sm:text-5xl font-bold text-rose-600 leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {/* PLACEHOLDER — Alex will replace this */}
                Aloha, Tami! 🌺
              </h1>
              <p className="text-xl text-amber-700 font-medium">
                {/* PLACEHOLDER */}
                A little something special, just for you.
              </p>
            </div>

            {/* Personal message */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl px-6 py-6 text-left space-y-4">
              <p className="text-lg text-gray-700 leading-relaxed">
                {/* PLACEHOLDER — Alex will write the real message */}
                Hey sweetheart! 👋
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {/* PLACEHOLDER */}
                I built this just for us — a personal travel planner powered by AI, designed to make
                planning our adventures together easy and fun. Our first trip is already in here waiting for you:
                <strong className="text-rose-600"> Hawaii this fall!</strong> 🌴
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {/* PLACEHOLDER */}
                Leilani — our AI travel guide — is ready to help us plan every detail, from activities on Oahu
                to finding the most unique places to stay on the Big Island. You can plan your way,
                I'll plan mine, and then we'll put it all together.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed font-medium text-rose-600">
                {/* PLACEHOLDER */}
                I love you. Let's go on an adventure. 🌺
              </p>
            </div>

            {/* What's inside */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              {[
                { emoji: "🤖", label: "AI Travel Guide", desc: "Leilani plans with you" },
                { emoji: "🗺️", label: "Island Maps", desc: "See everything visually" },
                { emoji: "💰", label: "Budget Tracker", desc: "Stay on budget easily" },
                { emoji: "✈️", label: "Flight Tracker", desc: "All flights in one place" },
                { emoji: "📅", label: "Day Planner", desc: "Build your daily schedule" },
                { emoji: "👨‍👩‍👧‍👦", label: "Family Planning", desc: "Everyone contributes" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white border border-rose-100 rounded-xl p-3 text-center shadow-sm"
                >
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleStart}
                disabled={markWelcomed.isPending}
                className="w-full h-14 text-xl font-bold rounded-2xl shadow-lg"
                style={{ background: "linear-gradient(135deg, #f43f5e, #fb923c)", border: "none" }}
              >
                🌺 Let's Start Planning!
              </Button>
              <p className="text-sm text-gray-400">
                This welcome page won't show again — you can always find help using the "How This Works" button.
              </p>
            </div>

          </div>

          {/* Bottom rainbow bar */}
          <div
            className="h-3 w-full"
            style={{ background: "linear-gradient(90deg, #818cf8, #38bdf8, #34d399, #fbbf24, #fb923c, #f43f5e, #818cf8)" }}
          />
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 mt-6">
          {/* PLACEHOLDER — will become "Thank you for your purchase" if marketed */}
          Made with ❤️ by Alex
        </p>
      </div>
    </div>
  );
}
