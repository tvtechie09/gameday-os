"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/access/session";
import { canDelayGame, canOpenCloseField, canSendAnnouncement, canStartGame } from "@/lib/access/capabilities";
import { getSession, setSessionStatus } from "@/lib/services/sessions";
import { updateFieldStatus } from "@/lib/services/fields";
import { createAlert } from "@/lib/services/alerts";
import type { FieldStatus } from "@/lib/types";

export type QuickActionResult = { ok: boolean; message: string };

function revalidateToday() {
  revalidatePath("/today");
  revalidatePath("/admin/dashboard");
}

// Start the next scheduled game: flip its status to active (live).
export async function startGameAction(sessionId: string): Promise<QuickActionResult> {
  const ctx = await getSessionContext();
  if (!canStartGame(ctx)) return { ok: false, message: "You don't have permission to start games." };
  if (!sessionId) return { ok: false, message: "No game is ready to start." };
  try {
    const session = await getSession(sessionId);
    if (!session) return { ok: false, message: "That game no longer exists." };
    if (session.status === "active") return { ok: true, message: "Game is already live." };
    await setSessionStatus(sessionId, "active");
    revalidateToday();
    return { ok: true, message: "Started " + (session.title || session.homeTeam + " vs " + session.awayTeam) + " — now live." };
  } catch {
    return { ok: false, message: "Could not start the game. Try again." };
  }
}

// Delay a game: flag its field delayed (players/followers see the hold).
export async function delayGameAction(fieldId: string): Promise<QuickActionResult> {
  const ctx = await getSessionContext();
  if (!canDelayGame(ctx)) return { ok: false, message: "You don't have permission to delay games." };
  if (!fieldId) return { ok: false, message: "No game is available to delay." };
  try {
    await updateFieldStatus(fieldId, "delayed");
    revalidateToday();
    return { ok: true, message: "Field flagged delayed — the hold is now public." };
  } catch {
    return { ok: false, message: "Could not delay the game. Try again." };
  }
}

// Open/close a field: toggle its playable status.
export async function setFieldStatusAction(fieldId: string, status: FieldStatus): Promise<QuickActionResult> {
  const ctx = await getSessionContext();
  if (!canOpenCloseField(ctx)) return { ok: false, message: "You don't have permission to change field status." };
  if (!fieldId) return { ok: false, message: "Pick a field first." };
  try {
    await updateFieldStatus(fieldId, status);
    revalidateToday();
    return { ok: true, message: "Field marked " + status + "." };
  } catch {
    return { ok: false, message: "Could not update the field. Try again." };
  }
}

// Send a venue announcement (public alert).
export async function sendAnnouncementAction(venueId: string, message: string): Promise<QuickActionResult> {
  const ctx = await getSessionContext();
  if (!canSendAnnouncement(ctx)) return { ok: false, message: "You don't have permission to send announcements." };
  const text = message.trim();
  if (!venueId) return { ok: false, message: "No venue to announce for." };
  if (text.length < 3) return { ok: false, message: "Write a short message first." };
  try {
    const now = new Date();
    await createAlert({
      title: "Venue announcement",
      message: text.slice(0, 500),
      alert_type: "info",
      alert_scope: "venue",
      alert_priority: "normal",
      alert_visibility: "public",
      venue_id: venueId,
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    });
    revalidateToday();
    return { ok: true, message: "Announcement sent." };
  } catch {
    return { ok: false, message: "Could not send the announcement. Try again." };
  }
}
