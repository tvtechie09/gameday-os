import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { FieldPageViewSummary } from "@/lib/types";

export type RecordFieldPageViewInput = {
  venueId: string;
  fieldId: string;
  sessionId?: string | null;
  pageType?: string | null;
  userAgent?: string | null;
};

function sanitizeText(value: string | null | undefined, fallback = "") {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 240) : fallback;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function daysAgo(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

export async function recordFieldPageView(input: RecordFieldPageViewInput) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("field_page_views").insert({
    venue_id: input.venueId,
    field_id: input.fieldId,
    session_id: input.sessionId ?? null,
    page_type: sanitizeText(input.pageType, "field_page"),
    user_agent: sanitizeText(input.userAgent) || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getFieldPageViewCountSince(since: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("field_page_views")
    .select("id", { count: "exact", head: true })
    .gte("viewed_at", since);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getFieldPageViewDashboardCounts() {
  const [today, last7Days] = await Promise.all([
    getFieldPageViewCountSince(startOfToday()),
    getFieldPageViewCountSince(daysAgo(7)),
  ]);

  return { today, last7Days };
}

export async function getFieldPageViewCountsByField(): Promise<FieldPageViewSummary[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("field_page_views")
    .select("field_id");

  if (error) {
    throw new Error(error.message);
  }

  const counts = (data ?? []).reduce<Record<string, number>>((summary, view) => {
    summary[view.field_id] = (summary[view.field_id] ?? 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts).map(([fieldId, views]) => ({ fieldId, views }));
}
