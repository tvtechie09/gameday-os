"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/access/session";
import { canDelayGame, canStartGame, managesAllVenues, venueInScope, type AccessContext } from "@/lib/access/capabilities";
import { getFields, updateFieldStatus } from "@/lib/services/fields";
import { getVenue } from "@/lib/services/venues";
import { getGameById, recordGameStateChange } from "@/lib/game-engine/game-service";
import { assertTransition } from "@/lib/game-engine/game-lifecycle";
import { randomUUID } from "crypto";

export type QuickActionResult = { ok: boolean; message: string };

function revalidateToday() {
  revalidatePath("/today");
}

// Capability grants the verb; scope grants the venue. A venue-scoped role holds
// these capabilities globally, so every action must confirm the target belongs
// to a venue the caller operates (platform/org admins pass through).
async function venueIdInScope(ctx: AccessContext | null, venueId: string | undefined): Promise<boolean> {
  if (managesAllVenues(ctx)) return true;
  if (!venueId) return false;
  const venue = await getVenue(venueId);
  return venue ? venueInScope(ctx, venue) : false;
}

async function venueIdForField(fieldId: string): Promise<string | undefined> {
  const fields = await getFields().catch(() => []);
  return fields.find((field) => field.id === fieldId)?.venueId;
}

const OUT_OF_SCOPE: QuickActionResult = { ok: false, message: "That venue isn't in your scope." };

// Start the next scheduled game: flip its status to active (live).
export async function startGameAction(sessionId: string): Promise<QuickActionResult> {
  const ctx = await getSessionContext();
  if (!canStartGame(ctx)) return { ok: false, message: "You don't have permission to start games." };
  if (!sessionId) return { ok: false, message: "No game is ready to start." };
  try {
    const game = await getGameById(sessionId);
    if (!game) return { ok: false, message: "That game no longer exists." };
    if (!(await venueIdInScope(ctx, await venueIdForField(game.fieldId)))) return OUT_OF_SCOPE;
    if (game.lifecycleStatus === "live") return { ok: true, message: "Game is already live." };
    // Authorization already done above (canStartGame + venue scope), same as
    // the scorekeeper's token+PIN authz. Verify the lifecycle transition is
    // legal, then write through the Connected Game Engine: a game.started event
    // + live state, with the RPC keeping the legacy session status in sync so
    // existing surfaces are unchanged.
    assertTransition(game.lifecycleStatus, "live");
    await recordGameStateChange({
      gameId: sessionId,
      organizationId: game.organizationId ?? null,
      sportType: game.sportType,
      lifecycleStatus: "live",
      eventType: "game.started",
      actorType: "user",
      actorId: ctx?.userId,
      sourceType: "venue-app",
      idempotencyKey: randomUUID(),
      payload: { from: game.lifecycleStatus, to: "live" },
    });
    revalidateToday();
    return { ok: true, message: "Started " + (game.title || game.homeTeam + " vs " + game.awayTeam) + " — now live." };
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
    if (!(await venueIdInScope(ctx, await venueIdForField(fieldId)))) return OUT_OF_SCOPE;
    await updateFieldStatus(fieldId, "delayed", ctx?.userId);
    revalidateToday();
    return { ok: true, message: "Field flagged delayed — the hold is now public." };
  } catch {
    return { ok: false, message: "Could not delay the game. Try again." };
  }
}
