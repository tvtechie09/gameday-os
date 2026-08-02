import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getSession, getSessions, setSessionStatus } from "@/lib/services/sessions";
import { getFields } from "@/lib/services/fields";
import { assertActorUserId, requirePermission } from "@/lib/services/identity";
import type { Session } from "@/lib/types";
import {
  assertTransition,
  eventTypeForTransition,
  isGameLifecycleStatus,
  legacyStatusFor,
  lifecycleFromLegacy,
  type GameLifecycleStatus,
} from "./game-lifecycle";
import { normalizeEventInput, type GameEventInput, type GameEventRecord } from "./game-events";
import { isSameVenueDay } from "@/lib/services/command-center-core";

// Connected Game Engine — shared Game domain service (Sprint 1 slice).
//
// Reads are served today from the canonical sessions table (the Game record);
// game_live_state / game_events are consulted with graceful degradation until the
// 20260713040000 migration is applied (generated, not applied — see the ADR).
// The single controlled write path validates authorization, checks lifecycle
// legality, then applies state + event transactionally via the
// game_engine_apply RPC with idempotent replay; if the engine tables are not
// yet migrated it falls back to the legacy status write so behavior never
// regresses during rollout.

export type GameRecord = Session & { lifecycleStatus: GameLifecycleStatus };

export type GameStateRecord = {
  gameId: string;
  organizationId: string | null;
  sportType: string;
  scoreHome: number;
  scoreAway: number;
  state: Record<string, unknown>;
  version: number;
  updatedAt: string;
  // True when served from game_live_state; false when projected from the legacy
  // baseball columns on sessions (pre-migration fallback).
  fromEngine: boolean;
};

function isMissingEngineSchema(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205"
    || error.code === "42P01"
    || error.code === "42883"
    || (error.message ?? "").includes("game_live_state")
    || (error.message ?? "").includes("game_events")
    || (error.message ?? "").includes("game_engine_apply")
    || (error.message ?? "").includes("schema cache");
}

function toGameRecord(session: Session): GameRecord {
  const raw = (session as Session & { lifecycleStatus?: string }).lifecycleStatus;
  const lifecycleStatus = raw && isGameLifecycleStatus(raw) ? raw : lifecycleFromLegacy(session.status);
  return { ...session, lifecycleStatus };
}

// ---- Reads -----------------------------------------------------------------

export async function getGameById(gameId: string): Promise<GameRecord | null> {
  const session = await getSession(gameId);
  return session ? toGameRecord(session) : null;
}

// Was `iso.slice(0, 10) === date`, which compared the UTC date against a VENUE
// date. Every game after ~7pm Central rolls onto the next UTC day and vanished
// from "today" — the exact hours a complex runs under lights. `timeZone` must be
// the VENUE's zone: matching an Eastern venue against Central reopens the same
// hole, just an hour earlier in the evening.
function sameLocalDay(iso: string, date: string, timeZone?: string): boolean {
  return isSameVenueDay(iso, date, timeZone);
}

export async function listGamesForVenue(
  venueId: string,
  options?: {
    date?: string;
    timeZone?: string;
    preloaded?: { sessions: Session[]; fields: Array<{ id: string; venueId: string }> };
  }
): Promise<GameRecord[]> {
  const [sessions, fields] = options?.preloaded
    ? [options.preloaded.sessions, options.preloaded.fields]
    : await Promise.all([getSessions(), getFields().catch(() => [])]);
  const fieldIds = new Set(fields.filter((field) => field.venueId === venueId).map((field) => field.id));
  return sessions
    .filter((session) => fieldIds.has(session.fieldId))
    .filter((session) => !options?.date || sameLocalDay(session.startTime, options.date, options.timeZone))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(toGameRecord);
}

export async function listGamesByFieldAndDate(fieldId: string, date?: string, timeZone?: string): Promise<GameRecord[]> {
  const sessions = await getSessions();
  return sessions
    .filter((session) => session.fieldId === fieldId)
    .filter((session) => !date || sameLocalDay(session.startTime, date, timeZone))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(toGameRecord);
}

// "Team" at the platform layer = a verified GameDay Team season link.
export async function listGamesByTeamSeason(gdtTeamSeasonId: string): Promise<GameRecord[]> {
  const sessions = await getSessions();
  return sessions
    .filter((session) => {
      const linked = session as Session & { gdtTeamSeasonId?: string | null; gdtHomeTeamSeasonId?: string | null; gdtAwayTeamSeasonId?: string | null };
      return linked.gdtTeamSeasonId === gdtTeamSeasonId
        || linked.gdtHomeTeamSeasonId === gdtTeamSeasonId
        || linked.gdtAwayTeamSeasonId === gdtTeamSeasonId;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(toGameRecord);
}

export async function getCurrentGameState(gameId: string): Promise<GameStateRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_live_state")
    .select("game_id,organization_id,sport_type,score_home,score_away,state,version,updated_at")
    .eq("game_id", gameId)
    .maybeSingle();
  if (!error && data) {
    return {
      gameId: data.game_id,
      organizationId: data.organization_id,
      sportType: data.sport_type,
      scoreHome: data.score_home,
      scoreAway: data.score_away,
      state: (data.state ?? {}) as Record<string, unknown>,
      version: data.version,
      updatedAt: data.updated_at,
      fromEngine: true,
    };
  }
  if (error && !isMissingEngineSchema(error)) throw new Error(error.message);
  // Pre-migration fallback: project the legacy baseball columns.
  const session = await getSession(gameId);
  if (!session) return null;
  return {
    gameId: session.id,
    organizationId: session.organizationId ?? null,
    sportType: session.sportType,
    scoreHome: session.homeScore,
    scoreAway: session.awayScore,
    state: { inning: session.inning, half: session.inningHalf, balls: session.balls, strikes: session.strikes, outs: session.outs },
    version: (session as Session & { scorekeeperSeq?: number }).scorekeeperSeq ?? 1,
    updatedAt: session.updatedAt,
    fromEngine: false,
  };
}

// ACTUAL start/finish times for many games at once, straight from the event
// ledger. `sessions.start_time` is the SCHEDULED slot; this is when the game
// really began and ended — the difference is the whole point of an end-of-day
// report. Degrades to an empty map pre-migration so callers fall back to
// session status instead of throwing.
export async function getGameLifecycleTimestamps(
  gameIds: string[],
): Promise<Map<string, { startedAt: string | null; finalAt: string | null }>> {
  const out = new Map<string, { startedAt: string | null; finalAt: string | null }>();
  if (!gameIds.length) return out;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_events")
    .select("game_id,event_type,occurred_at")
    .in("game_id", gameIds)
    .in("event_type", ["game.started", "game.completed"])
    .order("occurred_at", { ascending: true });
  if (error || !data) return out;
  for (const row of data as Array<{ game_id: string; event_type: string; occurred_at: string }>) {
    const marks = out.get(row.game_id) ?? { startedAt: null, finalAt: null };
    // First start wins (a resumed game keeps its original first pitch); last
    // completion wins (a corrected final overwrites).
    if (row.event_type === "game.started" && !marks.startedAt) marks.startedAt = row.occurred_at;
    if (row.event_type === "game.completed") marks.finalAt = row.occurred_at;
    out.set(row.game_id, marks);
  }
  return out;
}

export async function listGameEvents(gameId: string, limit = 100): Promise<GameEventRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_events")
    .select("*")
    .eq("game_id", gameId)
    .order("recorded_at", { ascending: true })
    .limit(limit);
  if (error) {
    if (isMissingEngineSchema(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    gameId: row.game_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    actorType: row.actor_type,
    actorId: row.actor_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    idempotencyKey: row.idempotency_key,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

// ---- The controlled write path ----------------------------------------------

// Low-level engine write for producers that carry their OWN authorization
// (scorekeeper token+PIN, device adapters, integration bearer tokens) — no
// user permission check here; the caller is responsible for authz. Best-effort:
// if the engine schema isn't present (e.g. local dev pre-migration) it returns
// { skipped: true } so the caller's authoritative write is never affected.
export type EngineWriteResult =
  | { skipped: true }
  | { accepted: boolean; replayed: boolean; newVersion: number };

export async function recordGameStateChange(input: {
  gameId: string;
  organizationId: string | null;
  sportType: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
  state?: Record<string, unknown>;
  lifecycleStatus?: GameLifecycleStatus | null;
  eventType: string;
  actorType: string;
  actorId?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<EngineWriteResult> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("game_engine_apply", {
    p_game_id: input.gameId,
    p_expected_version: null,
    p_score_home: input.scoreHome ?? null,
    p_score_away: input.scoreAway ?? null,
    p_state: input.state ?? {},
    p_lifecycle_status: input.lifecycleStatus ?? null,
    p_organization_id: input.organizationId,
    p_sport_type: input.sportType,
    p_event_type: input.eventType,
    p_event_version: 1,
    p_occurred_at: new Date().toISOString(),
    p_actor_type: input.actorType,
    p_actor_id: input.actorId ?? null,
    p_source_type: input.sourceType ?? "venue-app",
    p_source_id: input.sourceId ?? null,
    p_correlation_id: null,
    p_causation_id: null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_payload: input.payload ?? {},
    p_metadata: input.metadata ?? {},
  });
  if (error) {
    if (isMissingEngineSchema(error)) return { skipped: true };
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { accepted: Boolean(row?.accepted), replayed: Boolean(row?.replayed), newVersion: row?.new_version ?? 1 };
}

export type TransitionResult = {
  ok: boolean;
  replayed: boolean;
  lifecycleStatus: GameLifecycleStatus;
  engineApplied: boolean;
};

export async function transitionGameLifecycle(
  gameId: string,
  next: GameLifecycleStatus,
  options: {
    actorUserId?: string | null;
    event?: Partial<Omit<GameEventInput, "gameId" | "organizationId" | "eventType">>;
  }
): Promise<TransitionResult> {
  // 1) Authorization: same identity-platform gate the legacy game-state write uses.
  const actor = assertActorUserId(options.actorUserId);
  await requirePermission(actor, "game.status.update", "session", gameId);

  // 2) Lifecycle legality.
  const game = await getGameById(gameId);
  if (!game) throw new Error("Game not found.");
  assertTransition(game.lifecycleStatus, next);

  // 3) Transactional state + event via the engine RPC (idempotent replay).
  const event = normalizeEventInput({
    gameId,
    organizationId: game.organizationId ?? null,
    eventType: eventTypeForTransition(next) as GameEventInput["eventType"],
    actorType: options.event?.actorType ?? "user",
    actorId: options.event?.actorId ?? actor,
    sourceType: options.event?.sourceType ?? "venue-app",
    sourceId: options.event?.sourceId ?? null,
    correlationId: options.event?.correlationId ?? null,
    causationId: options.event?.causationId ?? null,
    idempotencyKey: options.event?.idempotencyKey ?? null,
    payload: { from: game.lifecycleStatus, to: next, ...(options.event?.payload ?? {}) },
    metadata: options.event?.metadata ?? {},
  });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("game_engine_apply", {
    p_game_id: gameId,
    p_expected_version: null,
    p_score_home: null,
    p_score_away: null,
    p_state: {},
    p_lifecycle_status: next,
    p_organization_id: event.organizationId,
    p_sport_type: game.sportType,
    p_event_type: event.eventType,
    p_event_version: event.eventVersion,
    p_occurred_at: event.occurredAt,
    p_actor_type: event.actorType,
    p_actor_id: event.actorId,
    p_source_type: event.sourceType,
    p_source_id: event.sourceId,
    p_correlation_id: event.correlationId,
    p_causation_id: event.causationId,
    p_idempotency_key: event.idempotencyKey,
    p_payload: event.payload,
    p_metadata: event.metadata,
  });

  if (error) {
    if (!isMissingEngineSchema(error)) throw new Error(error.message);
    // Pre-migration fallback: keep the legacy projection moving so no
    // existing workflow regresses while the engine schema awaits review.
    await setSessionStatus(gameId, legacyStatusFor(next));
    return { ok: true, replayed: false, lifecycleStatus: next, engineApplied: false };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: Boolean(row?.accepted),
    replayed: Boolean(row?.replayed),
    lifecycleStatus: next,
    engineApplied: true,
  };
}
