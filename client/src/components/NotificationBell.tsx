/**
 * NotificationBell.tsx
 *
 * Real-time notification bell for the TripDashboard header.
 * Shows an unread badge count and a dropdown with recent note events.
 * Also displays a connection status dot (green = live, grey = reconnecting).
 */

import { useState, useRef, useEffect } from "react";
import { Bell, BellRing, CheckCheck, FileText, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NoteEvent, SSEStatus } from "@/hooks/useSSE";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  packing_list: "Packing List",
  reminder: "Reminder",
  tip: "Travel Tip",
  journal: "Journal",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  note_added: <FileText className="w-4 h-4 text-emerald-600" />,
  note_updated: <Pencil className="w-4 h-4 text-amber-500" />,
  note_deleted: <Trash2 className="w-4 h-4 text-red-400" />,
};

const EVENT_LABELS: Record<string, string> = {
  note_added: "added a note",
  note_updated: "updated a note",
  note_deleted: "deleted a note",
};

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationBellProps {
  notifications: NoteEvent[];
  unreadCount: number;
  status: SSEStatus;
  onMarkAllRead: () => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  status,
  onMarkAllRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unreadCount > 0) onMarkAllRead();
  };

  const statusColor =
    status === "connected" ? "bg-emerald-400" :
    status === "connecting" ? "bg-amber-400 animate-pulse" :
    "bg-gray-300";

  const statusTitle =
    status === "connected" ? "Live — connected" :
    status === "connecting" ? "Reconnecting…" :
    "Disconnected";

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted transition-colors"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        {unreadCount > 0
          ? <BellRing className="w-5 h-5 text-primary" />
          : <Bell className="w-5 h-5 text-muted-foreground" />
        }

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Connection status dot */}
        <span
          className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-background ${statusColor}`}
          title={statusTitle}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">Live Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} title={statusTitle} />
              <span className="text-xs text-muted-foreground">{statusTitle}</span>
            </div>
          </div>

          {/* Mark all read */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-border">
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  You'll see alerts here when family members add notes
                </p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={`${n.noteId}-${n.timestamp}-${i}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {EVENT_ICONS[n.type] ?? <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">{n.authorName}</span>
                      {" "}{EVENT_LABELS[n.type] ?? "updated the trip"}
                      {n.title && (
                        <span className="text-muted-foreground"> — "{n.title}"</span>
                      )}
                    </p>
                    {n.category && (
                      <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                        {CATEGORY_LABELS[n.category] ?? n.category}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(n.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Notifications appear when family members add or update notes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
