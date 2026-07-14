// Connected Game Engine: canonical lifecycle state machine. Pure and
// dependency-free — the DB constrains the value set; transition legality is
// enforced here, at the single controlled write path.

export const GAME_LIFECYCLE_STATUSES = [
  "draft", "scheduled", "check_in", "warmup", "ready", "live",
  "delayed", "suspended", "postponed", "cancelled", "final", "archived",
] as const;

export type GameLifecycleStatus = (typeof GAME_LIFECYCLE_STATUSES)[number];

// Legacy 3-state projection consumed by every existing surface.
export type LegacySessionStatus = "scheduled" | "active" | "final";

const ALLOWED: Record<GameLifecycleStatus, GameLifecycleStatus[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["check_in", "warmup", "ready", "live", "delayed", "postponed", "cancelled"],
  check_in: ["warmup", "ready", "live", "delayed", "cancelled"],
  warmup: ["ready", "live", "delayed", "cancelled"],
  ready: ["live", "delayed", "cancelled"],
  live: ["delayed", "suspended", "final"],
  delayed: ["live", "suspended", "postponed", "cancelled", "ready"],
  suspended: ["live", "postponed", "cancelled", "final"],
  postponed: ["scheduled", "cancelled"],
  cancelled: ["archived"],
  final: ["archived"],
  archived: [],
};

export function isGameLifecycleStatus(value: string): value is GameLifecycleStatus {
  return (GAME_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: GameLifecycleStatus, to: GameLifecycleStatus): boolean {
  if (from === to) return false;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: GameLifecycleStatus, to: GameLifecycleStatus): void {
  if (!canTransition(from, to)) {
    throw new Error("Illegal game lifecycle transition: " + from + " → " + to + ".");
  }
}

// Legacy projection kept in lockstep so existing readers never change behavior.
export function legacyStatusFor(lifecycle: GameLifecycleStatus): LegacySessionStatus {
  if (lifecycle === "live" || lifecycle === "suspended") return "active";
  if (lifecycle === "final" || lifecycle === "cancelled" || lifecycle === "archived") return "final";
  return "scheduled";
}

// Best-effort promotion of legacy rows that predate the lifecycle column.
export function lifecycleFromLegacy(status: string): GameLifecycleStatus {
  if (status === "active") return "live";
  if (status === "final") return "final";
  return "scheduled";
}

// The event a lifecycle transition implies on the ledger.
export function eventTypeForTransition(to: GameLifecycleStatus): string {
  const map: Partial<Record<GameLifecycleStatus, string>> = {
    scheduled: "game.scheduled",
    live: "game.started",
    delayed: "game.delayed",
    suspended: "game.suspended",
    postponed: "game.postponed",
    cancelled: "game.cancelled",
    final: "game.completed",
    archived: "game.archived",
  };
  return map[to] ?? "game.lifecycle_changed";
}
