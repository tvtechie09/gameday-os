import { randomBytes, randomInt, timingSafeEqual } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { recordGameStateChange } from "@/lib/game-engine/game-service";
import { lifecycleFromLegacy } from "@/lib/game-engine/game-lifecycle";
import { scorekeeperIdempotencyKey } from "@/lib/game-engine/game-events";

// Rung 1 scoring: any adult at the field can keep score through a per-game
// link + 4-digit PIN — no account, no admin access. Updates are absolute
// state snapshots with a monotonic sequence so offline outbox replays are
// idempotent and last-writer-wins per game.

export type ScorekeeperState = {
  home_score: number;
  away_score: number;
  inning: number;
  inning_half: "top" | "bottom";
  outs: number;
  game_status: "scheduled" | "active" | "final";
};

export type ScorekeeperSessionView = {
  session_id: string;
  title: string;
  home_team: string;
  away_team: string;
  field_name: string;
  start_time: string;
  seq: number;
  state: ScorekeeperState;
};

const scorekeeperSelect = "id,title,home_team,away_team,home_score,away_score,inning,inning_half,outs,game_status,status,start_time,field_id,organization_id,sport_type,scorekeeper_pin,scorekeeper_seq";

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function sanitizeScorekeeperState(input: Partial<ScorekeeperState>, current: ScorekeeperState): ScorekeeperState {
  const status = input.game_status === "active" || input.game_status === "final" || input.game_status === "scheduled" ? input.game_status : current.game_status;
  return {
    home_score: clampInt(input.home_score, 0, 199, current.home_score),
    away_score: clampInt(input.away_score, 0, 199, current.away_score),
    inning: clampInt(input.inning, 1, 30, current.inning),
    inning_half: input.inning_half === "top" || input.inning_half === "bottom" ? input.inning_half : current.inning_half,
    outs: clampInt(input.outs, 0, 3, current.outs),
    game_status: status
  };
}

function pinsMatch(expected: string, provided: string) {
  const a = Buffer.from(expected.padEnd(16, "#"));
  const b = Buffer.from(provided.padEnd(16, "#"));
  return a.length === b.length && timingSafeEqual(a, b);
}

type SessionRow = {
  id: string; title: string; home_team: string; away_team: string;
  home_score: number; away_score: number; inning: number; inning_half: string;
  outs: number; game_status: string; status: string; start_time: string;
  field_id: string; organization_id: string | null; sport_type: string;
  scorekeeper_pin: string | null; scorekeeper_seq: number;
};

// Mirror an accepted scorekeeper snapshot into the Connected Game Engine
// (game_live_state + a score.changed event). Best-effort and idempotent
// (keyed on token:seq) — the sessions CAS above stays the authority, so a
// engine hiccup never affects live scoring at the field.
async function mirrorToGameEngine(token: string, seq: number, row: SessionRow, next: ScorekeeperState) {
  try {
    await recordGameStateChange({
      gameId: row.id,
      organizationId: row.organization_id ?? null,
      sportType: row.sport_type || "baseball",
      scoreHome: next.home_score,
      scoreAway: next.away_score,
      state: { inning: next.inning, half: next.inning_half, outs: next.outs },
      lifecycleStatus: lifecycleFromLegacy(next.game_status),
      eventType: "score.changed",
      actorType: "scorekeeper",
      actorId: token.slice(0, 8),
      sourceType: "venue-app",
      idempotencyKey: scorekeeperIdempotencyKey(token, seq),
      payload: { home: next.home_score, away: next.away_score, inning: next.inning, half: next.inning_half, outs: next.outs, game_status: next.game_status },
    });
  } catch (error) {
    console.error("Game engine mirror failed (scoring unaffected)", error);
  }
}

function toView(row: SessionRow, fieldName: string): ScorekeeperSessionView {
  return {
    session_id: row.id,
    title: row.title || row.home_team + " vs " + row.away_team,
    home_team: row.home_team,
    away_team: row.away_team,
    field_name: fieldName,
    start_time: row.start_time,
    seq: Number(row.scorekeeper_seq) || 0,
    state: {
      home_score: row.home_score ?? 0,
      away_score: row.away_score ?? 0,
      inning: row.inning ?? 1,
      inning_half: row.inning_half === "top" ? "top" : "bottom",
      outs: row.outs ?? 0,
      game_status: row.game_status === "active" || row.game_status === "final" ? row.game_status : "scheduled"
    }
  };
}

/** Admin-side: create (or return existing) scorekeeper credentials for a session. */
export async function ensureScorekeeperAccess(sessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error } = await supabase.from("sessions").select("id,scorekeeper_token,scorekeeper_pin").eq("id", sessionId).maybeSingle();
  if (error || !existing) throw new Error("Session not found.");
  if (existing.scorekeeper_token && existing.scorekeeper_pin) {
    return { token: existing.scorekeeper_token as string, pin: existing.scorekeeper_pin as string };
  }
  const token = randomBytes(12).toString("hex");
  const pin = String(randomInt(0, 10000)).padStart(4, "0");
  const { error: updateError } = await supabase.from("sessions").update({ scorekeeper_token: token, scorekeeper_pin: pin }).eq("id", sessionId);
  if (updateError) throw new Error(updateError.message);
  return { token, pin };
}

async function loadByToken(token: string) {
  const supabase = getSupabaseAdminClient();
  const { data: row, error } = await supabase.from("sessions").select(scorekeeperSelect).eq("scorekeeper_token", token).maybeSingle();
  if (error || !row) return null;
  const { data: field } = await supabase.from("fields").select("name").eq("id", (row as SessionRow).field_id).maybeSingle();
  return { row: row as SessionRow, fieldName: field?.name || "Field", supabase };
}

/** Public: verify PIN and return the current game view. */
export async function openScorekeeperSession(token: string, pin: string): Promise<ScorekeeperSessionView | null> {
  const loaded = await loadByToken(token);
  if (!loaded || !loaded.row.scorekeeper_pin || !pinsMatch(loaded.row.scorekeeper_pin, pin)) return null;
  return toView(loaded.row, loaded.fieldName);
}

/**
 * Public: apply an absolute state snapshot. Replays with seq <= stored are
 * acknowledged without changes so the offline outbox can retry safely.
 */
export async function applyScorekeeperState(token: string, pin: string, seq: number, input: Partial<ScorekeeperState>): Promise<ScorekeeperSessionView | null> {
  const nextSeq = Math.round(Number(seq));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loaded = await loadByToken(token);
    if (!loaded || !loaded.row.scorekeeper_pin || !pinsMatch(loaded.row.scorekeeper_pin, pin)) return null;
    const { row, fieldName, supabase } = loaded;
    const currentSeq = Number(row.scorekeeper_seq) || 0;
    if (!Number.isFinite(nextSeq) || nextSeq <= currentSeq) {
      // Replay of an already-applied (or superseded) snapshot: acknowledge.
      return toView(row, fieldName);
    }
    const current = toView(row, fieldName).state;
    const next = sanitizeScorekeeperState(input, current);
    const { data: updated, error } = await supabase
      .from("sessions")
      .update({
        home_score: next.home_score,
        away_score: next.away_score,
        inning: next.inning,
        inning_half: next.inning_half,
        outs: next.outs,
        game_status: next.game_status,
        status: next.game_status,
        scorekeeper_seq: nextSeq
      })
      .eq("id", row.id)
      .eq("scorekeeper_seq", currentSeq)
      .select(scorekeeperSelect)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (updated) {
      await mirrorToGameEngine(token, nextSeq, updated as SessionRow, next);
      return toView(updated as SessionRow, fieldName);
    }
    // A concurrent sync advanced the sequence between read and write; retry —
    // this snapshot is newer and must not be dropped.
  }
  const fresh = await loadByToken(token);
  return fresh ? toView(fresh.row, fresh.fieldName) : null;
}
