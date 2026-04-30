/**
 * useSSE.ts
 *
 * React hook that connects to the server's SSE endpoint for a specific trip.
 * Automatically reconnects on disconnect with exponential backoff.
 * Returns the latest event and a list of recent notification events.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type NoteEventType = "note_added" | "note_updated" | "note_deleted" | "ping";

export interface NoteEvent {
  type: NoteEventType;
  tripId: number;
  noteId?: number;
  authorName: string;
  authorId: number;
  title?: string;
  category?: string;
  content?: string;
  timestamp: string;
}

export type SSEStatus = "connecting" | "connected" | "disconnected";

interface UseSSEResult {
  status: SSEStatus;
  notifications: NoteEvent[];
  unreadCount: number;
  markAllRead: () => void;
  latestEvent: NoteEvent | null;
}

const MAX_NOTIFICATIONS = 20;
const BASE_RETRY_MS = 2000;
const MAX_RETRY_MS = 30000;

export function useSSE(tripId: number | null | undefined): UseSSEResult {
  const [status, setStatus] = useState<SSEStatus>("disconnected");
  const [notifications, setNotifications] = useState<NoteEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestEvent, setLatestEvent] = useState<NoteEvent | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!tripId || !mountedRef.current) return;

    setStatus("connecting");

    const es = new EventSource(`/api/events/${tripId}`, { withCredentials: true });
    esRef.current = es;

    es.addEventListener("ping", () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      retryCountRef.current = 0;
    });

    const handleNoteEvent = (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const event: NoteEvent = JSON.parse(e.data);
        setLatestEvent(event);
        setNotifications(prev => {
          const updated = [event, ...prev].slice(0, MAX_NOTIFICATIONS);
          return updated;
        });
        setUnreadCount(c => c + 1);
        setStatus("connected");
        retryCountRef.current = 0;
      } catch {
        // Ignore malformed events
      }
    };

    es.addEventListener("note_added", handleNoteEvent);
    es.addEventListener("note_updated", handleNoteEvent);
    es.addEventListener("note_deleted", handleNoteEvent);

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      esRef.current = null;
      setStatus("disconnected");

      // Exponential backoff reconnect
      const delay = Math.min(BASE_RETRY_MS * Math.pow(2, retryCountRef.current), MAX_RETRY_MS);
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  }, [tripId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { status, notifications, unreadCount, markAllRead, latestEvent };
}
