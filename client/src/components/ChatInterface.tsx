import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mascot } from "./Mascot";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import type { Trip } from "../../../drizzle/schema";

// ─── Quick Reply Suggestions ──────────────────────────────────────────────────

const STAGE_SUGGESTIONS: Record<string, string[]> = {
  welcome: [
    "We're planning for fall 2025",
    "Thinking about September or October",
    "We'd like to go in November",
  ],
  dates: [
    "We'll do Oahu first, then Big Island",
    "Just Oahu for now",
    "Oahu and Maui sounds perfect",
  ],
  islands: [
    "Our budget is around $8,000–10,000",
    "We're thinking $5,000–7,000",
    "We have about $12,000 to spend",
  ],
  budget: [
    "We love snorkeling and beaches",
    "We want cultural experiences and history",
    "Mix of adventure and relaxation",
  ],
  activities: [
    "Show me unique vacation rentals",
    "Find us a beachfront condo",
    "What about Airbnb options?",
  ],
  lodging: [
    "We'll fly from Denver",
    "Flying from Los Angeles",
    "Departing from New York",
  ],
  transportation: [
    "Can you summarize our plan?",
    "Let's review everything",
    "Show me the full itinerary",
  ],
  summary: [
    "Can we refine the activities?",
    "Let's look at more lodging options",
    "What about dining recommendations?",
  ],
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  mascotType: string;
  isNew?: boolean;
}

function MessageBubble({ role, content, mascotType, isNew }: MessageBubbleProps) {
  if (role === "system") return null;

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="chat-message-user text-base">
          <p style={{ margin: 0 }}>{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="shrink-0 mt-0.5">
        <Mascot mascotType={mascotType} size="sm" animated={isNew} />
      </div>
      <div className="chat-message-assistant flex-1">
        <Streamdown className="streamdown-content text-base">{content}</Streamdown>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ mascotType }: { mascotType: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="shrink-0 mt-0.5">
        <Mascot mascotType={mascotType} size="sm" animated />
      </div>
      <div className="chat-message-assistant">
        <div className="flex items-center gap-1.5 py-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Chat Interface ──────────────────────────────────────────────────────

interface ChatInterfaceProps {
  trip: Trip;
  onTripUpdate: () => void;
  memberId?: number | null;
  memberName?: string;
}

export function ChatInterface({ trip, onTripUpdate, memberId, memberName }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [latestMsgId, setLatestMsgId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const { data: messages = [], isLoading } = trpc.chat.messages.useQuery(
    { tripId: trip.id, memberId: memberId ?? null },
    { refetchInterval: false }
  );

  const initWelcome = trpc.chat.initWelcome.useMutation({
    onSuccess: () => {
      utils.chat.messages.invalidate({ tripId: trip.id, memberId: memberId ?? null });
    },
  });

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setLatestMsgId(data.id);
      utils.chat.messages.invalidate({ tripId: trip.id, memberId: memberId ?? null });
      onTripUpdate();
      setIsSending(false);
    },
    onError: () => {
      toast.error("Couldn't send message. Please try again.");
      setIsSending(false);
    },
  });

  // Initialize welcome message when chat is first opened (per member session)
  useEffect(() => {
    if (!isLoading && messages.length === 0) {
      initWelcome.mutate({ tripId: trip.id, memberId: memberId ?? null });
    }
  }, [isLoading, messages.length, memberId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    setIsSending(true);
    sendMessage.mutate({ tripId: trip.id, message: text, memberId: memberId ?? null });
  }, [input, isSending, trip.id, memberId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = STAGE_SUGGESTIONS[trip.planningStage] || [];

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as "user" | "assistant" | "system"}
              content={msg.content}
              mascotType={trip.mascotType}
              isNew={msg.id === latestMsgId}
            />
          ))
        )}

        {isSending && <TypingIndicator mascotType={trip.mascotType} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick reply suggestions */}
      {suggestions.length > 0 && !isSending && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Quick replies
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                  textareaRef.current?.focus();
                }}
                className="text-sm px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here... (Press Enter to send)"
            className="flex-1 resize-none text-base min-h-[52px] max-h-[140px] rounded-xl border-border focus:border-primary"
            rows={1}
            disabled={isSending}
            style={{ fontSize: "1rem" }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="lg"
            className="h-[52px] w-[52px] p-0 rounded-xl gradient-tropical text-white border-0 shadow-md hover:opacity-90 transition-opacity shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
