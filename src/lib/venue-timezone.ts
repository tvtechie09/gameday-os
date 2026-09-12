// The venue's own clock.
//
// Every venue-local calculation in this app — which calendar day a game belongs
// to, what time a slot reads, when the operating day ends — has to happen in the
// timezone the venue actually stands in, not the server's and not a hardcoded
// Central Time. This module is the single source for that value: dependency-free
// so the pure cores can import it, and defensive so a bad row can never make a
// screen throw.

// What venues.timezone defaults to, and what every threaded parameter falls back
// to. Central Time keeps the Chicagoland founding cohort behaving exactly as it
// did before per-venue timezones existed.
export const DEFAULT_VENUE_TIMEZONE = "America/Chicago";

// The zones a US sports complex actually sits in. Not exhaustive — a venue can
// store any IANA name; this is the picker's shortlist.
export const VENUE_TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "America/New_York", label: "Eastern — New York" },
  { value: "America/Chicago", label: "Central — Chicago" },
  { value: "America/Denver", label: "Mountain — Denver" },
  { value: "America/Phoenix", label: "Mountain (no DST) — Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific — Los Angeles" },
  { value: "America/Anchorage", label: "Alaska — Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii — Honolulu" },
];

// Is this a timezone the runtime can actually format with?
export function isValidTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// Coerce whatever we were handed into a usable zone.
//
// A venue row with a typo'd or empty timezone must not take down the Command
// Center — falling back to Central shows a wrong-by-an-hour label, which is
// recoverable, where an unhandled RangeError is not.
export function normalizeVenueTimezone(value: string | null | undefined): string {
  const candidate = (value ?? "").trim();
  return isValidTimeZone(candidate) ? candidate : DEFAULT_VENUE_TIMEZONE;
}

// Short zone label for a given instant ("CDT", "EST"), so a screen can say which
// clock it is showing instead of asserting "Central Time" everywhere.
export function timeZoneAbbreviation(timeZone: string, at: Date = new Date()): string {
  const zone = normalizeVenueTimezone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(at);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

function zoneOffsetMinutes(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeVenueTimezone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  let hour = read("hour");
  if (hour === 24) hour = 0;
  const localAsUtc = Date.UTC(read("year"), read("month") - 1, read("day"), hour, read("minute"));
  return Math.round((localAsUtc - ms) / 60_000);
}

export function venueLocalDateTimeToIso(value: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("Enter a valid local date and time.");
  const [, year, month, day, hour, minute] = match;
  const utcGuess = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let instant = utcGuess - zoneOffsetMinutes(utcGuess, timeZone) * 60_000;
  instant = utcGuess - zoneOffsetMinutes(instant, timeZone) * 60_000;
  const iso = new Date(instant).toISOString();
  if (venueDateTimeLocalValue(iso, timeZone) !== value) throw new Error("That local time does not exist in the venue timezone.");
  return iso;
}

export function venueDateTimeLocalValue(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeVenueTimezone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}
