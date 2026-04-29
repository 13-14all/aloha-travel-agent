/**
 * WelcomeGuest.tsx
 *
 * First-login welcome page for general family and friends.
 * Shows once on first sign-in, then never again.
 * Placeholder content — Alex will provide the real message later.
 * Could become a "Thank you for your purchase" page if marketed.
 */

import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function WelcomeGuest() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const markWelcomed = trpc.auth.markWelcomed.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate("/");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">

        {/* Top decoration */}
        <div className="text-center mb-2 text-5xl">🌴</div>

        {/* Main card */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl overflow-hidden border border-teal-100">

          {/* Top rainbow bar */}
          <div
            className="h-3 w-full"
            style={{ background: "linear-gradient(90deg, #38bdf8, #34d399, #fbbf24, #fb923c, #f43f5e, #818cf8, #38bdf8)" }}
          />

          <div className="px-8 py-10 sm:px-12 sm:py-14 text-center space-y-8">

            {/* Mascot */}
            <div className="flex justify-center">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-lg border-4 border-white"
                style={{ background: "linear-gradient(135deg, #a7f3d0, #38bdf8)" }}
              >
                🌺
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1
                className="text-4xl sm:text-5xl font-bold text-teal-700 leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {/* PLACEHOLDER — Alex will replace this */}
                Welcome to Aloha Travel! 🌺
              </h1>
              <p className="text-xl text-sky-600 font-medium">
                {/* PLACEHOLDER */}
                Your personal AI-powered travel planner
              </p>
            </div>

            {/* Welcome message */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl px-6 py-6 text-left space-y-4">
              <p className="text-lg text-gray-700 leading-relaxed">
                {/* PLACEHOLDER — Alex will write the real message */}
                Hi there, and welcome! 👋
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {/* PLACEHOLDER */}
                You've been invited to join a trip planning group. This app makes it easy for everyone
                in the family to contribute ideas, find activities, and help build the perfect itinerary —
                no matter how tech-savvy you are.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {/* PLACEHOLDER */}
                Your AI travel guide is ready to help. Just chat naturally — tell them what you're
                interested in and they'll find the best options for you.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed font-medium text-teal-700">
                {/* PLACEHOLDER */}
                Let's start planning something wonderful together! 🌴
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              {[
                { emoji: "💬", label: "Easy Chat", desc: "Just type naturally" },
                { emoji: "🔍", label: "AI Search", desc: "Finds the best options" },
                { emoji: "📋", label: "Your List", desc: "Save your favorites" },
                { emoji: "🗺️", label: "Maps", desc: "See it all visually" },
                { emoji: "👨‍👩‍👧", label: "Family", desc: "Plan together" },
                { emoji: "❓", label: "Help", desc: "Always available" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white border border-teal-100 rounded-xl p-3 text-center shadow-sm"
                >
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Tips for getting started */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-left">
              <p className="text-sm font-bold text-amber-800 mb-2">📌 Quick Tips:</p>
              <ul className="space-y-1.5 text-sm text-amber-700">
                <li>• Click <strong>"How This Works"</strong> at the top of any page for a full guide</li>
                <li>• Use the <strong>🛠️ Suggest a Change</strong> button to share ideas or report issues</li>
                <li>• Your planning is saved automatically — you can come back any time</li>
                <li>• Not sure what to say? Just start with "I'm interested in..." and let the AI guide you</li>
              </ul>
            </div>

            {/* CTA */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => markWelcomed.mutate()}
                disabled={markWelcomed.isPending}
                className="w-full h-14 text-xl font-bold rounded-2xl shadow-lg"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #14b8a6)", border: "none" }}
              >
                🌴 Let's Start Planning!
              </Button>
              <p className="text-sm text-gray-400">
                This welcome page won't show again — you can always find help using the "How This Works" button.
              </p>
            </div>

          </div>

          {/* Bottom bar */}
          <div
            className="h-3 w-full"
            style={{ background: "linear-gradient(90deg, #818cf8, #f43f5e, #fb923c, #fbbf24, #34d399, #38bdf8, #818cf8)" }}
          />
        </div>

        {/* Footer note — PLACEHOLDER: will become "Thank you for your purchase" if marketed */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Powered by Aloha Travel Agent · Made with ❤️
        </p>
      </div>
    </div>
  );
}
