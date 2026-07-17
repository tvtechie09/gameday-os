// Coach field reservations — pure core (dependency-free, unit-tested).
//
// Turns a recurring block grant ("Illinois Celtics, Field 3, Tue/Wed/Thu 6-9pm,
// 90-min slots, this season") into the concrete slots a coach can claim, and
// resolves each against existing claims into open / taken / mine / requested /
// past. All IO lives in field-reservations.ts.
//
// The atomic no-double-book guarantee is NOT here — it lives in the DB exclusion
// constraint (see migration 20260717090000). This layer decides which slots
// EXIST and how to present them; the database decides who wins a race.

const CHICAGO = "America/Chicago";

// The venue's calendar day/time. The whole app is Chicago-local today (see
// command-center-core); multi-timezone venues are a later concern.
export type GrantRecurrence = {
  daysOfWeek: number[]; // 0=Sun .. 6=Sat
  windowStartMinute: number; // minutes from local midnight, e.g. 18*60
  windowEndMinute: number;
  slotMinutes: number;
  seasonStartDate: string; // YYYY-MM-DD
  seasonEndDate: string; // YYYY-MM-DD
};

export type ReservationSlot = {
  startsAt: string; // ISO, absolute
  endsAt: string;
  startLabel: string; // "Tue 6:00 PM"
  endLabel: string; // "7:30 PM"
};

export type ClaimLite = {
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "requested" | "denied" | "cancelled";
  claimedByName: string;
  claimedByUserId: string | null;
};

export type SlotState =
  | { kind: "past" }
  | { kind: "open" }
  | { kind: "mine"; claimedByName: string; status: "confirmed" | "requested" }
  | { kind: "taken"; claimedByName: string }
  | { kind: "contested"; requests: string[] }; // approval mode, >1 pending, none mine

export type ResolvedSlot = ReservationSlot & { state: SlotState };

// --- Local-time helpers ------------------------------------------------------

// The venue-local calendar date (YYYY-MM-DD) for an absolute instant.
function localDateString(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHICAGO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

// Day of week (0=Sun) in venue-local time.
function localDayOfWeek(ms: number): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: CHICAGO, weekday: "short" }).format(new Date(ms));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

// The absolute instant of local `YYYY-MM-DD` + `minutesFromMidnight` in Chicago.
// Resolves the timezone offset by probing what UTC guess actually lands on the
// intended local wall-clock time — correct across DST without a tz library.
function localWallClockToInstant(dateStr: string, minutesFromMidnight: number): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  // Start from the UTC guess, then correct by the offset Chicago had at that guess.
  const utcGuess = Date.UTC(y, m - 1, d, hour, minute);
  const offsetMin = chicagoOffsetMinutes(utcGuess);
  return utcGuess - offsetMin * 60_000;
}

// Chicago's UTC offset in minutes at a given instant (negative: behind UTC).
function chicagoOffsetMinutes(ms: number): number {
  // Format the instant in Chicago and in UTC, diff the wall clocks.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  let hour = get("hour");
  if (hour === 24) hour = 0; // some engines render midnight as 24
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"));
  return Math.round((asUTC - ms) / 60_000);
}

export function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: CHICAGO }).format(new Date(iso));
}

function dayTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: CHICAGO }).format(new Date(iso));
}

// --- Slot expansion ----------------------------------------------------------

export const MAX_EXPANDED_SLOTS = 2000; // a full season of dense slots, capped

// Every claimable slot of a grant that falls within [rangeStartMs, rangeEndMs).
// Range is clamped to the season; a partial final slot that would run past the
// daily window is dropped (you can't claim 8:30-9:30 in a window ending at 9).
export function expandGrantSlots(
  recurrence: GrantRecurrence,
  rangeStartMs: number,
  rangeEndMs: number,
): ReservationSlot[] {
  const slots: ReservationSlot[] = [];
  if (recurrence.slotMinutes <= 0) return slots;
  if (recurrence.windowEndMinute <= recurrence.windowStartMinute) return slots;

  const days = new Set(recurrence.daysOfWeek);
  if (days.size === 0) return slots;

  // Iterate venue-local dates from the later of (range start, season start) to the
  // earlier of (range end, season end). Walk by UTC noon to stay clear of DST edges.
  const seasonStartMs = localWallClockToInstant(recurrence.seasonStartDate, 12 * 60);
  const seasonEndMs = localWallClockToInstant(recurrence.seasonEndDate, 12 * 60);
  let cursor = Math.max(rangeStartMs, seasonStartMs);
  const end = Math.min(rangeEndMs, seasonEndMs + 24 * 60 * 60 * 1000);

  const seen = new Set<string>();
  let guard = 0;
  while (cursor < end && guard < 400) {
    guard += 1;
    const dateStr = localDateString(cursor);
    if (!seen.has(dateStr)) {
      seen.add(dateStr);
      const dow = localDayOfWeek(localWallClockToInstant(dateStr, 12 * 60));
      if (days.has(dow)) {
        for (
          let start = recurrence.windowStartMinute;
          start + recurrence.slotMinutes <= recurrence.windowEndMinute;
          start += recurrence.slotMinutes
        ) {
          const startMs = localWallClockToInstant(dateStr, start);
          const endMs = localWallClockToInstant(dateStr, start + recurrence.slotMinutes);
          if (endMs <= rangeStartMs || startMs >= rangeEndMs) continue;
          const startIso = new Date(startMs).toISOString();
          const endIso = new Date(endMs).toISOString();
          slots.push({ startsAt: startIso, endsAt: endIso, startLabel: dayTimeLabel(startIso), endLabel: timeLabel(endIso) });
          if (slots.length >= MAX_EXPANDED_SLOTS) return slots;
        }
      }
    }
    cursor += 24 * 60 * 60 * 1000;
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// --- Slot state resolution ---------------------------------------------------

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Annotate each slot for a given viewer. `viewerUserId` null means an anonymous
// preview (nothing is ever "mine").
export function resolveSlotStates(
  slots: ReservationSlot[],
  claims: ClaimLite[],
  nowMs: number,
  viewerUserId: string | null,
): ResolvedSlot[] {
  const live = claims.filter((c) => c.status === "confirmed" || c.status === "requested");
  return slots.map((slot) => {
    if (new Date(slot.startsAt).getTime() < nowMs) {
      return { ...slot, state: { kind: "past" } };
    }
    const hits = live.filter((c) => overlaps(slot.startsAt, slot.endsAt, c.startsAt, c.endsAt));

    const mine = viewerUserId ? hits.find((c) => c.claimedByUserId === viewerUserId) : undefined;
    if (mine) {
      return { ...slot, state: { kind: "mine", claimedByName: mine.claimedByName, status: mine.status as "confirmed" | "requested" } };
    }

    const confirmed = hits.find((c) => c.status === "confirmed");
    if (confirmed) {
      return { ...slot, state: { kind: "taken", claimedByName: confirmed.claimedByName } };
    }

    const requests = hits.filter((c) => c.status === "requested");
    if (requests.length > 0) {
      return { ...slot, state: { kind: "contested", requests: requests.map((r) => r.claimedByName) } };
    }

    return { ...slot, state: { kind: "open" } };
  });
}

// Is this the exact [startsAt, endsAt] of a real slot of the grant? A claim must
// land on a generated slot boundary, not an arbitrary time a hand-built request
// could smuggle in.
export function isClaimableSlot(recurrence: GrantRecurrence, startsAt: string, endsAt: string): boolean {
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return false;
  // Expand just the day of the requested slot and look for an exact match.
  const dayStart = startMs - 12 * 60 * 60 * 1000;
  const dayEnd = endMs + 12 * 60 * 60 * 1000;
  return expandGrantSlots(recurrence, dayStart, dayEnd).some(
    (s) => Date.parse(s.startsAt) === startMs && Date.parse(s.endsAt) === endMs,
  );
}
