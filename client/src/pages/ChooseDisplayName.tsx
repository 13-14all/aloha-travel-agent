/**
 * ChooseDisplayName.tsx
 *
 * Shown to every new user on their very first sign-in, BEFORE the welcome page.
 * Asks them to choose a friendly display name (e.g. "Alex", "Grandma Rose").
 * Large text, simple form — designed to be easy for elderly users.
 * Once submitted, sets hasChosenName = true and redirects to the welcome page.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ChooseDisplayName() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Pre-fill with OAuth name if it looks like a real name (not an email prefix like "13")
  const oauthName = user?.name ?? "";
  const looksLikeRealName = oauthName.length > 1 && !/^\d/.test(oauthName) && !oauthName.includes("@");
  const [displayName, setDisplayName] = useState(looksLikeRealName ? oauthName : "");
  const [error, setError] = useState("");

  const setName = trpc.profile.setDisplayName.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      // After choosing name, go to the appropriate welcome page
      const name = displayName.toLowerCase();
      if (name.includes("tami") || name.includes("tamara")) {
        navigate("/welcome/tami");
      } else {
        navigate("/welcome/guest");
      }
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Please enter a name so we know what to call you!");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setError("");
    setName.mutate({ displayName: trimmed });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">

        {/* Mascot */}
        <div className="text-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-xl border-4 border-white mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, #a7f3d0, #38bdf8)" }}
          >
            🌺
          </div>
          <p className="text-teal-600 font-semibold text-lg">Aloha! Welcome to your travel planner</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-teal-100 overflow-hidden">
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #38bdf8, #34d399, #fbbf24)" }} />

          <div className="px-8 py-10 space-y-6">
            <div className="text-center space-y-2">
              <h1
                className="text-3xl font-bold text-teal-700"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                What should we call you?
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed">
                Choose a friendly name that will appear throughout the app.
                <br />
                <span className="text-gray-400 text-base">
                  You can use your first name, a nickname — whatever feels right!
                </span>
              </p>
            </div>

            {/* Examples */}
            <div className="flex flex-wrap gap-2 justify-center">
              {["Alex", "Tami", "Grandma Rose", "Uncle Bob", "Dad", "Mom"].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setDisplayName(example)}
                  className="px-4 py-2 rounded-full border-2 border-teal-200 text-teal-700 text-sm font-medium hover:bg-teal-50 hover:border-teal-400 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="displayName"
                  className="block text-lg font-semibold text-gray-700"
                >
                  Your name:
                </label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your name here..."
                  maxLength={64}
                  autoFocus
                  className="h-14 text-xl rounded-xl border-2 border-teal-200 focus:border-teal-400 px-4"
                />
                {error && (
                  <p className="text-red-500 text-sm font-medium">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={setName.isPending || !displayName.trim()}
                className="w-full h-14 text-xl font-bold rounded-2xl shadow-lg"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #14b8a6)", border: "none" }}
              >
                {setName.isPending ? "Saving..." : `That's me — let's go! 🌴`}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-400">
              You can always change this later from your profile menu at the top of any page.
            </p>
          </div>

          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #fbbf24, #34d399, #38bdf8)" }} />
        </div>
      </div>
    </div>
  );
}
