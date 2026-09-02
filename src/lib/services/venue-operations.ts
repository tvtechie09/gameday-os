import { getVenues } from "@/lib/services/venues";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getActiveAlerts } from "@/lib/services/alerts";
import { getWorkOrders } from "@/lib/services/work-orders";
import { venueInScope, type AccessContext } from "@/lib/access/capabilities";
import { listGamesForVenue } from "@/lib/game-engine/game-service";
import { computeQuickActionTargets, labelFor, type QuickActionTargets } from "@/lib/services/quick-action-targets";
import type { Field, FieldStatus, Venue } from "@/lib/types";
import { DEFAULT_VENUE_TIMEZONE } from "@/lib/venue-timezone";
import { selectTodayEvents, type TodayAlert, type TodayEvent } from "@/lib/services/today-timeline";

// Resolves the venue the acting user operates and builds the LIVE Today's-
// Operations view from real sessions/fields/alerts — no demo data. A
// venue-scoped user gets their own venue; a platform/org admin gets the busiest
// venue by field count. The demo dataset stays confined to /demo/crossroads.

export type { QuickActionTargets };

export type TodayView = {
  venueId: string | null;
  venueName: string | null;
  // The venue's IANA zone, so the page's date header matches these time labels.
  timeZone: string;
  health: { activeGames: number; delayedFields: number; totalFields: number; maintenanceFields: number };
  events: TodayEvent[];
  fields: Array<{ id: string; name: string; status: FieldStatus }>;
  alerts: TodayAlert[];
  workOrders: Array<{ id: string; title: string; detail: string; priority: string }>;
  targets: QuickActionTargets;
};

function timeLabel(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone }).format(date);
}

// Pure venue picker: a venue-scoped user gets their own venue; everyone else
// gets the busiest venue by field count. Takes already-loaded venues/fields so
// callers can avoid redundant queries.
function pickActingVenue(ctx: AccessContext | null, venues: Venue[], fields: Field[]): Venue | null {
  if (!venues.length) return null;
  if (ctx && ctx.scopeType === "venue") {
    return venues.find((venue) => venueInScope(ctx, venue)) ?? null;
  }
  const fieldCount = new Map<string, number>();
  for (const field of fields) fieldCount.set(field.venueId, (fieldCount.get(field.venueId) ?? 0) + 1);
  return [...venues].sort((a, b) => (fieldCount.get(b.id) ?? 0) - (fieldCount.get(a.id) ?? 0))[0] ?? null;
}

export async function resolveActingVenue(ctx: AccessContext | null): Promise<Venue | null> {
  const [venues, fields] = await Promise.all([getVenues().catch(() => []), getFields().catch(() => [])]);
  return pickActingVenue(ctx, venues, fields);
}

const EMPTY_VIEW: TodayView = {
  venueId: null,
  venueName: null,
  timeZone: DEFAULT_VENUE_TIMEZONE,
  health: { activeGames: 0, delayedFields: 0, totalFields: 0, maintenanceFields: 0 },
  events: [],
  fields: [],
  alerts: [],
  workOrders: [],
  targets: { venueId: null, venueName: null, startGame: null, delayGame: null, fields: [] },
};

export async function buildTodayView(ctx: AccessContext | null): Promise<TodayView> {
  // Single parallel load, then pick the venue from what we already fetched.
  const [venues, allFields, allSessions, activeAlerts, workOrders] = await Promise.all([
    getVenues().catch(() => []),
    getFields().catch(() => []),
    getSessions().catch(() => []),
    getActiveAlerts().catch(() => []),
    getWorkOrders().catch(() => []),
  ]);
  const venue = pickActingVenue(ctx, venues, allFields);
  if (!venue) return EMPTY_VIEW;

  const venueFields = allFields.filter((field) => field.venueId === venue.id);
  const fieldIds = new Set(venueFields.map((field) => field.id));
  const now = Date.now();
  const timeZone = venue.timezone;

  // First consumer of the Connected Game Engine read path: same data, served
  // through the shared Game domain service (preloaded to keep the single
  // parallel batch above).
  const venueSessions = await listGamesForVenue(venue.id, { preloaded: { sessions: allSessions, fields: allFields } });
  const fieldById = new Map(venueFields.map((field) => [field.id, field]));
  const events = selectTodayEvents(venueSessions
    .filter((session) => session.lifecycleStatus !== "draft" && session.lifecycleStatus !== "archived")
    .map((session) => {
      const field = fieldById.get(session.fieldId);
      const matchup = `${session.homeTeam} vs ${session.awayTeam}`;
      const label = labelFor(session);
      return {
        id: session.id,
        eventName: label,
        opponent: label === matchup ? null : matchup,
        homeTeam: session.homeTeam,
        awayTeam: session.awayTeam,
        homeScore: session.homeScore,
        awayScore: session.awayScore,
        sportType: session.sportType,
        fieldId: session.fieldId,
        fieldName: field?.name || "Field",
        fieldStatus: field?.status || "open",
        startTime: session.startTime,
        endTime: session.endTime,
        dateLabel: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone }).format(new Date(session.startTime)),
        timeLabel: timeLabel(session.startTime, timeZone),
        status: session.status,
        lifecycleStatus: session.lifecycleStatus,
      };
    }), now, timeZone);
  const liveGames = events.filter((event) => event.status === "active");

  return {
    venueId: venue.id,
    venueName: venue.name,
    timeZone,
    health: {
      activeGames: liveGames.length,
      delayedFields: venueFields.filter((field) => field.status === "delayed").length,
      totalFields: venueFields.length,
      maintenanceFields: venueFields.filter((field) => field.status === "maintenance").length,
    },
    events,
    fields: venueFields.map((field) => ({ id: field.id, name: field.name, status: field.status })),
    alerts: activeAlerts
      .filter((alert) => alert.venueId === venue.id && alert.alertVisibility === "public")
      .slice(0, 5)
      .map((alert) => ({ id: alert.id, title: alert.title, message: alert.message, priority: alert.alertPriority, alertType: alert.alertType })),
    workOrders: workOrders
      .filter((order) => (order.venueId === venue.id || (order.fieldId !== null && fieldIds.has(order.fieldId))) && order.status !== "done" && order.status !== "resolved" && !order.closedAt)
      .slice(0, 6)
      .map((order) => ({ id: order.id, title: order.title, detail: order.detail ?? "", priority: order.priority })),
    targets: computeQuickActionTargets(venue, venueFields, venueSessions, Date.now()),
  };
}
