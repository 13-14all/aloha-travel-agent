import { useState, useEffect } from "react";

const MASCOT_DATA: Record<string, {
  emoji: string;
  name: string;
  tagline: string;
  color: string;
  bgColor: string;
  messages: string[];
}> = {
  hula_dancer: {
    emoji: "🌺",
    name: "Lei",
    tagline: "Your Hawaii Travel Guide",
    color: "oklch(0.72 0.14 35)",
    bgColor: "oklch(0.96 0.04 35)",
    messages: [
      "Aloha! Ready to find paradise? 🌺",
      "The islands are calling! 🌊",
      "Let's make some memories! 🌴",
      "Mahalo for planning with me! 🤙",
      "Shaka! Great choice! 🤙",
    ],
  },
  highlander: {
    emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    name: "Angus",
    tagline: "Your Scottish Highland Guide",
    color: "oklch(0.42 0.12 195)",
    bgColor: "oklch(0.94 0.04 195)",
    messages: [
      "Och aye! Scotland awaits! 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
      "The glens are calling! 🏔️",
      "Fancy a wee adventure? 🥃",
      "Brilliant choice, laddie! ⚔️",
    ],
  },
  gondolier: {
    emoji: "🍕",
    name: "Marco",
    tagline: "Your Italy Travel Guide",
    color: "oklch(0.55 0.18 35)",
    bgColor: "oklch(0.96 0.04 35)",
    messages: [
      "Benvenuti! Italy awaits! 🍕",
      "La dolce vita! 🍷",
      "Magnifico choice! 🎭",
      "Andiamo! Let's go! 🛶",
    ],
  },
  geisha: {
    emoji: "🌸",
    name: "Sakura",
    tagline: "Your Japan Travel Guide",
    color: "oklch(0.65 0.14 350)",
    bgColor: "oklch(0.97 0.03 350)",
    messages: [
      "Konnichiwa! Japan awaits! 🌸",
      "Subarashii! Wonderful! 🗼",
      "Yoroshiku! Let's plan! 🍣",
      "Sugoi! Amazing choice! 🎌",
    ],
  },
};

interface MascotProps {
  mascotType: string;
  size?: "sm" | "md" | "lg";
  showMessage?: boolean;
  animated?: boolean;
  className?: string;
}

export function Mascot({
  mascotType,
  size = "md",
  showMessage = false,
  animated = true,
  className = "",
}: MascotProps) {
  const mascot = MASCOT_DATA[mascotType] || MASCOT_DATA.hula_dancer;
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!showMessage) return;
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setMessageIndex((i) => (i + 1) % mascot.messages.length);
        setIsVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [showMessage, mascot.messages.length]);

  const sizeClasses = {
    sm: "text-4xl w-14 h-14",
    md: "text-5xl w-20 h-20",
    lg: "text-7xl w-28 h-28",
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 ${animated ? "mascot-sway" : ""}`}
        style={{ backgroundColor: mascot.bgColor, borderColor: mascot.color + "40" }}
        title={`${mascot.name} — ${mascot.tagline}`}
      >
        <span role="img" aria-label={mascot.name} className="select-none">
          {mascot.emoji}
        </span>
      </div>

      {showMessage && (
        <div
          className="text-sm font-medium px-3 py-1.5 rounded-full transition-opacity duration-300 text-center max-w-[160px]"
          style={{
            backgroundColor: mascot.bgColor,
            color: mascot.color,
            opacity: isVisible ? 1 : 0,
          }}
        >
          {mascot.messages[messageIndex]}
        </div>
      )}
    </div>
  );
}

export function MascotSidebar({ mascotType }: { mascotType: string }) {
  const mascot = MASCOT_DATA[mascotType] || MASCOT_DATA.hula_dancer;

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <Mascot mascotType={mascotType} size="md" animated showMessage />
      <div className="text-center mt-1">
        <p className="text-sidebar-foreground font-semibold text-base">{mascot.name}</p>
        <p className="text-sidebar-foreground/60 text-xs">{mascot.tagline}</p>
      </div>
    </div>
  );
}

export function getMascotData(mascotType: string) {
  return MASCOT_DATA[mascotType] || MASCOT_DATA.hula_dancer;
}
