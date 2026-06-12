import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { SponsorAnalyticsRange, SponsorAnalyticsSummary } from "@/lib/types";

type SponsorImpressionRow = Database["public"]["Tables"]["sponsor_impressions"]["Row"];
type SponsorClickRow = Database["public"]["Tables"]["sponsor_clicks"]["Row"];

export type SponsorAnalyticsEventInput = {
  sponsorId: string;
  fieldId?: string | null;
  sessionId?: string | null;
  pageType?: string;
};

export const sponsorAnalyticsRanges: Array<{ value: SponsorAnalyticsRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function readSponsorAnalyticsRange(value: string | string[] | undefined): SponsorAnalyticsRange {
  const range = Array.isArray(value) ? value[0] : value;
  return range === "today" || range === "7d" || range === "30d" || range === "all" ? range : "30d";
}

function getRangeStart(range: SponsorAnalyticsRange) {
  const now = new Date();

  if (range === "all") {
    return null;
  }

  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  const start = new Date(now);
  start.setDate(start.getDate() - (range === "7d" ? 7 : 30));
  return start.toISOString();
}

function sanitizePageType(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 80) : "field_page";
}

function summarize(
  sponsorIds: string[],
  impressions: Pick<SponsorImpressionRow, "sponsor_id">[],
  clicks: Pick<SponsorClickRow, "sponsor_id">[],
): SponsorAnalyticsSummary[] {
  const impressionsBySponsor = impressions.reduce<Record<string, number>>((counts, event) => {
    counts[event.sponsor_id] = (counts[event.sponsor_id] ?? 0) + 1;
    return counts;
  }, {});
  const clicksBySponsor = clicks.reduce<Record<string, number>>((counts, event) => {
    counts[event.sponsor_id] = (counts[event.sponsor_id] ?? 0) + 1;
    return counts;
  }, {});

  return sponsorIds.map((sponsorId) => {
    const impressionCount = impressionsBySponsor[sponsorId] ?? 0;
    const clickCount = clicksBySponsor[sponsorId] ?? 0;
    return {
      sponsorId,
      impressions: impressionCount,
      clicks: clickCount,
      ctr: impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0,
    };
  });
}

export async function recordSponsorImpressions(events: SponsorAnalyticsEventInput[]) {
  const uniqueEvents = [...new Map(events.map((event) => [event.sponsorId, event])).values()]
    .filter((event) => event.sponsorId)
    .map((event) => ({
      sponsor_id: event.sponsorId,
      field_id: event.fieldId ?? null,
      session_id: event.sessionId ?? null,
      page_type: sanitizePageType(event.pageType),
    }));

  if (uniqueEvents.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("sponsor_impressions").insert(uniqueEvents);

  if (error) {
    throw new Error(error.message);
  }
}

export async function recordSponsorClick(event: SponsorAnalyticsEventInput) {
  if (!event.sponsorId) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("sponsor_clicks").insert({
    sponsor_id: event.sponsorId,
    field_id: event.fieldId ?? null,
    session_id: event.sessionId ?? null,
    page_type: sanitizePageType(event.pageType),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getSponsorAnalytics(sponsorIds: string[], range: SponsorAnalyticsRange): Promise<SponsorAnalyticsSummary[]> {
  const uniqueSponsorIds = [...new Set(sponsorIds.filter(Boolean))];

  if (uniqueSponsorIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const rangeStart = getRangeStart(range);
  let impressionsQuery = supabase.from("sponsor_impressions").select("sponsor_id").in("sponsor_id", uniqueSponsorIds);
  let clicksQuery = supabase.from("sponsor_clicks").select("sponsor_id").in("sponsor_id", uniqueSponsorIds);

  if (rangeStart) {
    impressionsQuery = impressionsQuery.gte("viewed_at", rangeStart);
    clicksQuery = clicksQuery.gte("clicked_at", rangeStart);
  }

  const [{ data: impressions, error: impressionError }, { data: clicks, error: clickError }] = await Promise.all([
    impressionsQuery,
    clicksQuery,
  ]);

  if (impressionError) {
    throw new Error(impressionError.message);
  }

  if (clickError) {
    throw new Error(clickError.message);
  }

  return summarize(uniqueSponsorIds, impressions ?? [], clicks ?? []);
}

export async function getSponsorAnalyticsForSponsor(sponsorId: string, range: SponsorAnalyticsRange): Promise<SponsorAnalyticsSummary> {
  return (await getSponsorAnalytics([sponsorId], range))[0] ?? {
    sponsorId,
    impressions: 0,
    clicks: 0,
    ctr: 0,
  };
}
