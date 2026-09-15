import type { AlertPriority, AlertType, FieldStatus, SessionLifecycleStatus, SessionSportType } from "@/lib/types";
import {
  isCurrentProjectionSession,
  isFutureProjectionSession,
  isSameVenueDay,
  venueDateString,
} from "./session-projection-core.ts";
import { DEFAULT_VENUE_TIMEZONE } from "../venue-timezone.ts";

export type TodayEvent = {
  id: string;
  eventName: string;
  opponent: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  sportType: SessionSportType;
  fieldId: string;
  fieldName: string;
  fieldStatus: FieldStatus;
  startTime: string;
  endTime: string | null;
  dateLabel: string;
  timeLabel: string;
  status: "scheduled" | "active" | "final";
  lifecycleStatus: SessionLifecycleStatus;
  assignment?: string | null;
};

export type TodayAlert = {
  id: string;
  title: string;
  message: string;
  priority: AlertPriority;
  alertType: AlertType;
};

export type TodayTimeline = {
  attention: TodayEvent[];
  now: TodayEvent[];
  next: TodayEvent[];
  later: TodayEvent[];
  completed: TodayEvent[];
};

const attentionLifecycles = new Set<SessionLifecycleStatus>(["cancelled", "delayed", "postponed", "suspended"]);
const attentionFields = new Set<FieldStatus>(["closed", "delayed", "maintenance"]);

export function todayEventNeedsAttention(event: TodayEvent): boolean {
  return attentionLifecycles.has(event.lifecycleStatus) || attentionFields.has(event.fieldStatus);
}

export function selectTodayEvents(
  events: TodayEvent[],
  now = Date.now(),
  timeZone = DEFAULT_VENUE_TIMEZONE,
): TodayEvent[] {
  const operatingDate = venueDateString(now, timeZone);
  return events
    .filter((event) => isSameVenueDay(event.startTime, operatingDate, timeZone))
    .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
}

export function buildTodayTimeline(
  events: TodayEvent[],
  now = Date.now(),
  timeZone = DEFAULT_VENUE_TIMEZONE,
): TodayTimeline {
  const sorted = selectTodayEvents(events, now, timeZone);
  const attention = sorted.filter(todayEventNeedsAttention);
  const normal = sorted.filter((event) => !todayEventNeedsAttention(event));
  const live = normal.filter((event) => isCurrentProjectionSession(event, now));
  const upcoming = normal.filter((event) => isFutureProjectionSession(event, now));
  const completed = normal.filter((event) => event.status === "final" || event.lifecycleStatus === "final");

  return {
    attention,
    now: live,
    next: upcoming.slice(0, 2),
    later: upcoming.slice(2),
    completed,
  };
}

export function eventChangePresentation(event: TodayEvent): { title: string; detail: string; tone: "warning" | "danger" } | null {
  if (event.lifecycleStatus === "cancelled") return { title: "GAME CANCELLED", detail: "This event is cancelled.", tone: "danger" };
  if (event.lifecycleStatus === "postponed") return { title: "GAME POSTPONED", detail: "A new start time has not been confirmed.", tone: "warning" };
  if (event.lifecycleStatus === "suspended") return { title: "PLAY SUSPENDED", detail: "Play is paused. Check the live game for the latest update.", tone: "warning" };
  if (event.lifecycleStatus === "delayed") return { title: "START DELAYED", detail: `Current listed start: ${event.timeLabel}.`, tone: "warning" };
  if (event.fieldStatus === "closed") return { title: "FIELD CLOSED", detail: `${event.fieldName} is unavailable.`, tone: "danger" };
  if (event.fieldStatus === "maintenance") return { title: "FIELD UNAVAILABLE", detail: `${event.fieldName} is in maintenance.`, tone: "danger" };
  if (event.fieldStatus === "delayed") return { title: "FIELD DELAY", detail: `${event.fieldName} is currently delayed.`, tone: "warning" };
  return null;
}
