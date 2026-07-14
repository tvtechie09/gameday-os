// Connected Game Engine: event model — pure builders and types for the
// append-only game_events ledger. See docs/architecture/connected-game-engine.md.

export type GameEventActorType = "user" | "scorekeeper" | "device" | "integration" | "system";
export type GameEventSourceType = "venue-app" | "team-app" | "scoreboard" | "integration" | "cron";

export type GameEventType =
  | "game.created"
  | "game.scheduled"
  | "game.field_assigned"
  | "game.started"
  | "game.delayed"
  | "game.resumed"
  | "game.suspended"
  | "game.postponed"
  | "game.cancelled"
  | "game.completed"
  | "game.archived"
  | "game.lifecycle_changed"
  | "score.changed"
  | "period.changed"
  | "participant.checked_in"
  | "official.checked_in"
  | "weather.alert_created"
  | "device.connected"
  | "device.disconnected"
  | "stream.started"
  | "stream.stopped";

export type GameEventInput = {
  gameId: string;
  organizationId: string | null;
  eventType: GameEventType;
  eventVersion?: number;
  occurredAt?: string;
  actorType: GameEventActorType;
  actorId?: string | null;
  sourceType?: GameEventSourceType;
  sourceId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type GameEventRecord = {
  id: string;
  organizationId: string | null;
  gameId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  recordedAt: string;
  actorType: string;
  actorId: string | null;
  sourceType: string;
  sourceId: string | null;
  correlationId: string | null;
  causationId: string | null;
  idempotencyKey: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

// Deterministic idempotency keys for the known at-least-once producers.
// Scorekeeper taps: one key per (token, seq). Integrations: source + external
// event id. UI actions supply a random uuid per submission.
export function scorekeeperIdempotencyKey(token: string, seq: number): string {
  return "scorekeeper:" + token + ":" + seq;
}

export function integrationIdempotencyKey(source: string, externalEventId: string): string {
  return "integration:" + source + ":" + externalEventId;
}

export function normalizeEventInput(input: GameEventInput): Required<Omit<GameEventInput, "gameId" | "organizationId" | "eventType" | "actorType">> & Pick<GameEventInput, "gameId" | "organizationId" | "eventType" | "actorType"> {
  return {
    gameId: input.gameId,
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventVersion: input.eventVersion ?? 1,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    sourceType: input.sourceType ?? "venue-app",
    sourceId: input.sourceId ?? null,
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    payload: input.payload ?? {},
    metadata: input.metadata ?? {},
  };
}
