import type { Session } from "@/lib/types";

export type ScheduleChange = {
  sessionId: string;
  fieldId: string;
  startTime: string;
  endTime: string | null;
  lifecycleStatus: Session["lifecycleStatus"];
  reason: string;
};

export type ScheduleConflict = {
  fieldId: string;
  firstSessionId: string;
  secondSessionId: string;
  message: string;
};

const INACTIVE = new Set<Session["lifecycleStatus"]>(["cancelled", "postponed", "final", "archived"]);
const DEFAULT_SLOT_MS = 90 * 60_000;

function endMs(value: Pick<Session, "startTime" | "endTime"> | Pick<ScheduleChange, "startTime" | "endTime">) {
  const start = Date.parse(value.startTime);
  const end = value.endTime ? Date.parse(value.endTime) : start + DEFAULT_SLOT_MS;
  return Number.isNaN(end) ? start + DEFAULT_SLOT_MS : end;
}

export function applyScheduleChanges(sessions: Session[], changes: ScheduleChange[]): Session[] {
  const byId = new Map(changes.map((change) => [change.sessionId, change]));
  return sessions.map((session) => {
    const change = byId.get(session.id);
    return change ? { ...session, fieldId: change.fieldId, startTime: change.startTime, endTime: change.endTime, lifecycleStatus: change.lifecycleStatus } : session;
  });
}

export function findScheduleConflicts(sessions: Session[], changes: ScheduleChange[] = []): ScheduleConflict[] {
  const changedIds = new Set(changes.map((change) => change.sessionId));
  const projected = applyScheduleChanges(sessions, changes)
    .filter((session) => !INACTIVE.has(session.lifecycleStatus))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < projected.length; i += 1) {
    for (let j = i + 1; j < projected.length; j += 1) {
      const first = projected[i];
      const second = projected[j];
      if (first.fieldId !== second.fieldId) continue;
      if (changes.length > 0 && !changedIds.has(first.id) && !changedIds.has(second.id)) continue;
      if (Date.parse(second.startTime) >= endMs(first)) break;
      if (Date.parse(first.startTime) < endMs(second)) {
        conflicts.push({
          fieldId: first.fieldId,
          firstSessionId: first.id,
          secondSessionId: second.id,
          message: `${first.title || first.homeTeam + " vs " + first.awayTeam} overlaps ${second.title || second.homeTeam + " vs " + second.awayTeam}.`,
        });
      }
    }
  }
  return conflicts;
}

function shift(session: Session, minutes: number, reason: string, fieldId = session.fieldId): ScheduleChange {
  const delta = minutes * 60_000;
  return {
    sessionId: session.id,
    fieldId,
    startTime: new Date(Date.parse(session.startTime) + delta).toISOString(),
    endTime: session.endTime ? new Date(Date.parse(session.endTime) + delta).toISOString() : null,
    lifecycleStatus: session.lifecycleStatus,
    reason,
  };
}

export function planSingleGameMove(session: Session, input: { fieldId?: string; startTime?: string; reason: string }): ScheduleChange {
  const nextStart = input.startTime ?? session.startTime;
  const duration = endMs(session) - Date.parse(session.startTime);
  return {
    sessionId: session.id,
    fieldId: input.fieldId ?? session.fieldId,
    startTime: nextStart,
    endTime: session.endTime ? new Date(Date.parse(nextStart) + duration).toISOString() : null,
    lifecycleStatus: session.lifecycleStatus,
    reason: input.reason,
  };
}

export function planDelay(session: Session, minutes: number): ScheduleChange {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 360) throw new Error("Delay must be between 1 and 360 minutes.");
  return shift(session, minutes, `Delayed ${minutes} minutes`);
}

export function planDelayRemaining(sessions: Session[], fieldId: string, fromTime: string, minutes: number): ScheduleChange[] {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 360) throw new Error("Delay must be between 1 and 360 minutes.");
  const boundary = Date.parse(fromTime);
  return sessions
    .filter((session) => session.fieldId === fieldId && Date.parse(session.startTime) >= boundary && !INACTIVE.has(session.lifecycleStatus))
    .map((session) => shift(session, minutes, `Field delayed ${minutes} minutes`));
}

export function planFieldSwap(first: Session, second: Session): ScheduleChange[] {
  if (first.id === second.id) throw new Error("Choose two different games to swap.");
  return [
    planSingleGameMove(first, { fieldId: second.fieldId, reason: `Swapped fields with ${second.title}` }),
    planSingleGameMove(second, { fieldId: first.fieldId, reason: `Swapped fields with ${first.title}` }),
  ];
}

export function planLifecycleChange(session: Session, status: "cancelled" | "postponed"): ScheduleChange {
  return { sessionId: session.id, fieldId: session.fieldId, startTime: session.startTime, endTime: session.endTime, lifecycleStatus: status, reason: status === "cancelled" ? "Game cancelled" : "Game postponed" };
}
