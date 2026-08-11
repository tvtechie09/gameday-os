// Reading a SportsEngine schedule into venue sessions.
//
// Moved here from gameday-team-os, where the mapping half was written first and
// then had nowhere to land: the team app has no "game" event type, and every
// venue capability we sell -- field pages, the weather hold, field-hours
// utilisation, the manual scoreboard -- hangs off a SESSION. A schedule
// imported into the team app would produce a calendar and nothing else.
//
// This is the "then API" half of the standing rule that a customer can bring
// their own platform: CSV import first, then API. GameDay is not the system of
// record for a SportsEngine organization and will not become a second copy of
// their schedule. It reads, reconciles, and reports.
//
// Pure: no network, no clock, no Supabase. Callers pass the timestamp and the
// existing rows in, so an import is reproducible and testable.
//
// Shapes are from SportsEngine's own docs (help.sportsengine.com articles
// 8261039 and 9095679) and treated defensively -- it is someone else's schema,
// versioned independently, and they publish a page called "Changes and
// Deprecations to the Schema".

import type { Field, SessionSportType, SessionStatus } from "@/lib/types";

/** An Event node as it arrives from the SportsEngine GraphQL API. */
export type SportsEngineEvent = {
  id?: string | null;
  organizationId?: number | string | null;
  name?: string | null;
  /** Their vocabulary: "game", "event", and others we do not control. */
  type?: string | null;
  /** ISO 8601, UTC. */
  start?: string | null;
  end?: string | null;
  status?: string | null;
  description?: string | null;
  updated?: string | null;
  location?: { name?: string | null; description?: string | null; url?: string | null; address?: string | null } | null;
  eventTeams?: Array<{ name?: string | null; homeTeam?: boolean | null; score?: string | null }> | null;
};

export type ImportedEventKind = "game" | "practice" | "scrimmage" | "event";

export type ImportedEvent = {
  /** Stable across imports. The idempotency key for the whole pipeline. */
  externalId: string;
  source: "sportsengine";
  organizationRef: string;
  kind: ImportedEventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  /** "scheduled" | "cancelled" | "postponed" | "final" */
  status: string;
  locationName: string;
  locationAddress: string;
  locationUrl: string;
  homeTeam: string;
  awayTeam: string;
  remoteUpdatedAt: string;
};

export type ImportProblem = { index: number; reason: string; id: string };
export type MappedPage = { events: ImportedEvent[]; problems: ImportProblem[] };

export const SPORTSENGINE_SOURCE = "sportsengine";

/**
 * Their `type` is a free string we do not control, so unknown values land on
 * "event" rather than being dropped -- a mystery on the calendar is
 * recoverable, a missing game is not.
 */
export function mapKind(type: string | null | undefined): ImportedEventKind {
  const value = (type || "").trim().toLowerCase();
  if (value === "game") return "game";
  if (value === "practice") return "practice";
  if (value === "scrimmage") return "scrimmage";
  return "event";
}

/**
 * Likewise for status. The documented example is "scheduled"; cancellations and
 * postponements are not documented at all, so anything that reads like one is
 * treated as one and everything else stays scheduled.
 *
 * Erring toward "scheduled" is the safe direction: showing a game that was
 * called off wastes a trip, but hiding one that is on means a child misses it.
 * Both are bad; only one is silent.
 */
export function mapStatus(status: string | null | undefined): string {
  const value = (status || "").trim().toLowerCase();
  if (!value) return "scheduled";
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("postpone")) return "postponed";
  if (value.includes("final") || value.includes("complete")) return "final";
  return "scheduled";
}

/** `sportsengine:<org>:<event>` — namespaced so a second provider cannot collide. */
export function externalIdFor(organizationRef: string, eventId: string): string {
  return SPORTSENGINE_SOURCE + ":" + organizationRef + ":" + eventId;
}

function isUsableInstant(value: string | null | undefined): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/**
 * Map one page of Event nodes.
 *
 * A node missing an id or a start time is reported rather than skipped in
 * silence, because "we imported 58 of 60 games" has to be something an operator
 * can see on the day, not a discrepancy discovered during a rainout.
 */
export function mapEventPage(nodes: SportsEngineEvent[], fallbackOrganizationRef = ""): MappedPage {
  const events: ImportedEvent[] = [];
  const problems: ImportProblem[] = [];

  nodes.forEach((node, index) => {
    const id = (node.id || "").trim();
    const organizationRef = String(node.organizationId ?? fallbackOrganizationRef ?? "").trim();

    if (!id) {
      problems.push({ index, id: "", reason: "event has no id, so it cannot be reconciled on the next import" });
      return;
    }
    if (!isUsableInstant(node.start)) {
      problems.push({ index, id, reason: "event has no usable start time" });
      return;
    }

    const teams = node.eventTeams ?? [];
    const home = teams.find((team) => team?.homeTeam)?.name || "";
    const away = teams.find((team) => team && !team.homeTeam)?.name || "";

    events.push({
      externalId: externalIdFor(organizationRef, id),
      source: SPORTSENGINE_SOURCE,
      organizationRef,
      kind: mapKind(node.type),
      title: (node.name || "").trim() || [home, away].filter(Boolean).join(" vs ") || "Untitled event",
      startsAt: new Date(node.start).toISOString(),
      endsAt: isUsableInstant(node.end) ? new Date(node.end).toISOString() : "",
      status: mapStatus(node.status),
      locationName: (node.location?.name || "").trim(),
      locationAddress: (node.location?.address || "").trim(),
      locationUrl: (node.location?.url || "").trim(),
      homeTeam: home,
      awayTeam: away,
      remoteUpdatedAt: isUsableInstant(node.updated) ? new Date(node.updated).toISOString() : ""
    });
  });

  return { events, problems };
}

export type PageInformation = { pages?: number | null; count?: number | null; page?: number | null; perPage?: number | null } | null | undefined;

/**
 * Whether to ask for another page. Defensive about a missing or malformed
 * pageInformation: stopping early silently truncates a season, and looping
 * forever is worse, so an unreadable block stops the walk and says so.
 */
export function hasNextPage(info: PageInformation): boolean {
  if (!info) return false;
  const page = Number(info.page);
  const pages = Number(info.pages);
  if (!Number.isFinite(page) || !Number.isFinite(pages)) return false;
  return page < pages;
}

// --- matching a location to one of our fields ---------------------------------

export type FieldMatch =
  | { matched: true; fieldId: string; fieldName: string; confidence: "exact" | "normalized" }
  | { matched: false; reason: string; candidates: string[] };

/** "Field #13 " and "field 13" are the same diamond to a human. */
function normalizeFieldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[#_]/g, " ")
    .replace(/\bfield\b|\bdiamond\b|\bfld\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/**
 * Match SportsEngine's free-text location onto one of our fields.
 *
 * This is the part of the import that cannot be automated away. SportsEngine
 * stores whatever the club typed -- "B13", "Field 13", "Tyler-Bentley #13" --
 * and we hold real fields with ids. Putting a game on the wrong diamond sends
 * a family to the wrong corner of a fifteen-diamond complex, so an ambiguous
 * or unrecognised location is REPORTED for a human, never guessed.
 *
 * Exact name wins; a normalized match is accepted; anything matching two or
 * more fields is refused out loud with the candidates named.
 */
export function matchFieldByName(locationName: string, fields: Pick<Field, "id" | "name">[]): FieldMatch {
  const raw = (locationName || "").trim();
  if (!raw) return { matched: false, reason: "the event has no location", candidates: [] };

  const exact = fields.filter((field) => field.name.trim().toLowerCase() === raw.toLowerCase());
  if (exact.length === 1) return { matched: true, fieldId: exact[0].id, fieldName: exact[0].name, confidence: "exact" };
  if (exact.length > 1) {
    return { matched: false, reason: "more than one field is named \"" + raw + "\"", candidates: exact.map((field) => field.name) };
  }

  const target = normalizeFieldName(raw);
  if (!target) return { matched: false, reason: "location \"" + raw + "\" has nothing to match on", candidates: [] };

  const near = fields.filter((field) => normalizeFieldName(field.name) === target);
  if (near.length === 1) return { matched: true, fieldId: near[0].id, fieldName: near[0].name, confidence: "normalized" };
  if (near.length > 1) {
    return { matched: false, reason: "\"" + raw + "\" is ambiguous", candidates: near.map((field) => field.name) };
  }
  return { matched: false, reason: "no field matches \"" + raw + "\"", candidates: [] };
}

// --- turning an imported event into a session ---------------------------------

/** The subset of Session an import owns. Everything else is ours to manage. */
export type SessionDraft = {
  fieldId: string;
  title: string;
  sportType: SessionSportType;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  endTime: string | null;
  status: SessionStatus;
  externalSource: string;
  externalSourceId: string;
  externalSourceUrl: string | null;
};

/**
 * Their status vocabulary is wider than ours: SessionStatus has no "cancelled"
 * or "postponed". Rather than invent one, a called-off game stays "scheduled"
 * here and the CALLER decides -- cancel the session, or leave it and let the
 * operator see the change in the reconcile report. Silently mapping cancelled
 * to final would mark a game as played.
 */
export function toSessionDraft(event: ImportedEvent, fieldId: string, sportType: SessionSportType = "baseball"): SessionDraft {
  return {
    fieldId,
    title: event.title,
    sportType,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    startTime: event.startsAt,
    endTime: event.endsAt || null,
    status: event.status === "final" ? "final" : "scheduled",
    externalSource: SPORTSENGINE_SOURCE,
    externalSourceId: event.externalId,
    externalSourceUrl: event.locationUrl || null
  };
}

// --- reconciliation -------------------------------------------------------------

export type StoredSession = {
  externalSourceId: string;
  startTime: string;
  endTime: string | null;
  status: string;
  title: string;
  fieldId: string;
};

export type ReconcileResult = {
  created: Array<{ event: ImportedEvent; draft: SessionDraft }>;
  /** Changed in a way a family would notice. */
  updated: Array<{ event: ImportedEvent; draft: SessionDraft; changes: string[] }>;
  unchanged: ImportedEvent[];
  /** Could not be placed on a field — needs a human, never a guess. */
  unplaced: Array<{ event: ImportedEvent; match: FieldMatch }>;
  /** Present locally, gone from the remote page — deleted upstream. */
  disappeared: StoredSession[];
};

const WATCHED: Array<{ stored: keyof StoredSession; draft: keyof SessionDraft; label: string }> = [
  { stored: "startTime", draft: "startTime", label: "start time" },
  { stored: "endTime", draft: "endTime", label: "end time" },
  { stored: "status", draft: "status", label: "status" },
  { stored: "title", draft: "title", label: "title" },
  { stored: "fieldId", draft: "fieldId", label: "field" }
];

/**
 * Compare a freshly-imported page against the sessions we already hold.
 *
 * `changes` is a list of human-readable field names rather than a boolean,
 * because the point of noticing a change is telling somebody: "start time and
 * field changed" is the notification, and it cannot be written from a flag.
 *
 * `disappeared` is reported, never auto-deleted. A partial page, a permissions
 * change, or an expired token all look exactly like "the game is gone", and
 * quietly removing a family's Saturday on that evidence is not a risk worth
 * taking. The caller decides.
 */
export function reconcileSessions(
  stored: StoredSession[],
  incoming: ImportedEvent[],
  fields: Pick<Field, "id" | "name">[],
  sportType: SessionSportType = "baseball"
): ReconcileResult {
  const byId = new Map(stored.map((session) => [session.externalSourceId, session]));
  const seen = new Set<string>();

  const created: ReconcileResult["created"] = [];
  const updated: ReconcileResult["updated"] = [];
  const unchanged: ImportedEvent[] = [];
  const unplaced: ReconcileResult["unplaced"] = [];

  for (const event of incoming) {
    // Marked seen BEFORE the field check, deliberately. "Seen" means the event
    // came back from SportsEngine, which is the only question `disappeared`
    // asks. Failing to place it on a field is our problem, not evidence that
    // the game was cancelled -- and if it fell through to `disappeared` an
    // operator could delete a real Saturday game because we could not read a
    // location string.
    seen.add(event.externalId);

    const match = matchFieldByName(event.locationName, fields);
    if (!match.matched) {
      unplaced.push({ event, match });
      continue;
    }
    const draft = toSessionDraft(event, match.fieldId, sportType);
    const existing = byId.get(event.externalId);
    if (!existing) {
      created.push({ event, draft });
      continue;
    }
    const changes = WATCHED
      .filter(({ stored: s, draft: d }) => String(existing[s] ?? "") !== String(draft[d] ?? ""))
      .map(({ label }) => label);
    if (changes.length) updated.push({ event, draft, changes });
    else unchanged.push(event);
  }

  return {
    created,
    updated,
    unchanged,
    unplaced,
    disappeared: stored.filter((session) => !seen.has(session.externalSourceId))
  };
}

/** "Start time and field changed" — the sentence a family actually receives. */
export function describeChanges(changes: string[]): string {
  if (!changes.length) return "";
  const list = changes.length === 1
    ? changes[0]
    : changes.slice(0, -1).join(", ") + " and " + changes[changes.length - 1];
  return list.charAt(0).toUpperCase() + list.slice(1) + " changed";
}
