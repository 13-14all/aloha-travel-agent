import type { Response } from "express";

// ── Types ──────────────────────────────────────────────────────────────────

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

interface SSEClient {
  res: Response;
  userId: number;
  tripId: number;
  connectedAt: Date;
}

// ── Connection Registry ────────────────────────────────────────────────────

// Map of tripId → Set of connected clients
const connections = new Map<number, Set<SSEClient>>();

/**
 * Register a new SSE client for a trip.
 * Returns a cleanup function to call when the connection closes.
 */
export function registerSSEClient(tripId: number, userId: number, res: Response): () => void {
  const client: SSEClient = { res, userId, tripId, connectedAt: new Date() };

  if (!connections.has(tripId)) {
    connections.set(tripId, new Set());
  }
  connections.get(tripId)!.add(client);

  // Send initial connection confirmation
  sendToClient(client, { type: "ping", tripId, authorName: "system", authorId: 0, timestamp: new Date().toISOString() });

  return () => {
    const tripClients = connections.get(tripId);
    if (tripClients) {
      tripClients.delete(client);
      if (tripClients.size === 0) {
        connections.delete(tripId);
      }
    }
  };
}

/**
 * Broadcast an event to all connected clients for a trip,
 * optionally excluding the author (so they don't get their own notification).
 */
export function broadcastToTrip(event: NoteEvent, excludeUserId?: number): void {
  const tripClients = connections.get(event.tripId);
  if (!tripClients || tripClients.size === 0) return;

  for (const client of Array.from(tripClients)) {
    // Skip the author — they already know what they just did
    if (excludeUserId !== undefined && client.userId === excludeUserId) continue;
    try {
      sendToClient(client, event);
    } catch {
      // Client disconnected mid-send; cleanup handled by close event
    }
  }
}

/**
 * Send a single SSE event to one client.
 */
function sendToClient(client: SSEClient, event: NoteEvent): void {
  const data = JSON.stringify(event);
  client.res.write(`event: ${event.type}\n`);
  client.res.write(`data: ${data}\n\n`);
  // Flush immediately so the browser receives it without buffering
  if (typeof (client.res as any).flush === "function") {
    (client.res as any).flush();
  }
}

/**
 * Return the number of active connections for a trip (useful for debugging).
 */
export function getConnectionCount(tripId: number): number {
  return connections.get(tripId)?.size ?? 0;
}
