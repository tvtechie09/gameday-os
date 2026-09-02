import { DEFAULT_VENUE_TIMEZONE } from "../venue-timezone.ts";

export type ProjectionSession = {
  id: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  lifecycleStatus: string;
};

export type FieldSessionProjection<T extends ProjectionSession> = {
  current: T | null;
  next: T | null;
  today: T[];
  upcoming: T[];
  remainingToday: T[];
};

const TERMINAL_LIFECYCLES = new Set(["cancelled", "postponed", "final", "archived"]);

export function venueDateString(now: number, timeZone: string = DEFAULT_VENUE_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}

export function isSameVenueDay(iso: string, date: string, timeZone: string = DEFAULT_VENUE_TIMEZONE): boolean {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return venueDateString(parsed.getTime(), timeZone) === date;
}

export function timeLabel(iso: string, timeZone: string = DEFAULT_VENUE_TIMEZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone }).format(date);
}

export function isProjectionEligible(session: ProjectionSession): boolean {
  return session.status !== "final" && !TERMINAL_LIFECYCLES.has(session.lifecycleStatus);
}

export function isCurrentProjectionSession(session: ProjectionSession, now: number): boolean {
  if (!isProjectionEligible(session)) return false;
  if (session.status === "active" || session.lifecycleStatus === "live" || session.lifecycleStatus === "suspended") return true;
  if (session.status !== "scheduled") return false;
  const startsAt = Date.parse(session.startTime);
  return Number.isFinite(startsAt) && startsAt <= now;
}

export function isFutureProjectionSession(session: ProjectionSession, now: number): boolean {
  if (!isProjectionEligible(session) || session.status !== "scheduled") return false;
  const startsAt = Date.parse(session.startTime);
  return Number.isFinite(startsAt) && startsAt > now;
}

export function projectFieldSessions<T extends ProjectionSession>(input: {
  sessions: T[];
  now: number;
  timeZone?: string;
}): FieldSessionProjection<T> {
  const timeZone = input.timeZone ?? DEFAULT_VENUE_TIMEZONE;
  const operatingDate = venueDateString(input.now, timeZone);
  const today = input.sessions
    .filter((session) => isSameVenueDay(session.startTime, operatingDate, timeZone))
    .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
  const sorted = input.sessions.toSorted((a, b) => a.startTime.localeCompare(b.startTime));
  const explicitCurrent = today.find((session) => isProjectionEligible(session)
    && (session.status === "active" || session.lifecycleStatus === "live" || session.lifecycleStatus === "suspended"));
  const overdueScheduled = today.filter((session) => isCurrentProjectionSession(session, input.now));
  const current = explicitCurrent ?? overdueScheduled.at(-1) ?? null;
  const upcoming = sorted.filter((session) => isFutureProjectionSession(session, input.now));
  const remainingToday = today.filter((session) => isFutureProjectionSession(session, input.now));
  return { current, next: upcoming[0] ?? null, today, upcoming, remainingToday };
}
