import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { FieldPageViewSummary } from "@/lib/types";
import { getOrganizationDataScope } from "./organization-data-scope";

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

function isMissingFieldPageViewsTableError(error: { code?: string; message?: string }) {
  return error.code === "PGRST205"
    || error.message?.toLowerCase().includes("field_page_views") === true
    || error.message?.toLowerCase().includes("schema cache") === true;
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
    if (isMissingFieldPageViewsTableError(error)) {
      console.error("field_page_views table is unavailable in Supabase schema cache; skipping field page view insert.", error);
      return;
    }

    throw new Error(error.message);
  }
}

export async function getFieldPageViewCountSince(since: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const scope = await getOrganizationDataScope();
  let query = supabase
    .from("field_page_views")
    .select("id", { count: "exact", head: true })
    .gte("viewed_at", since);

  if (scope) {
    if (scope.fieldIds.size === 0) {
      return 0;
    }

    query = query.in("field_id", [...scope.fieldIds]);
  }

  const { count, error } = await query;

  if (error) {
    if (isMissingFieldPageViewsTableError(error)) {
      console.error("field_page_views table is unavailable in Supabase schema cache; returning 0 field page views.", error);
      return 0;
    }

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
  const scope = await getOrganizationDataScope();
  let query = supabase
    .from("field_page_views")
    .select("field_id");

  if (scope) {
    if (scope.fieldIds.size === 0) {
      return [];
    }

    query = query.in("field_id", [...scope.fieldIds]);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingFieldPageViewsTableError(error)) {
      console.error("field_page_views table is unavailable in Supabase schema cache; returning no field page view counts.", error);
      return [];
    }

    throw new Error(error.message);
  }

  const counts = (data ?? []).reduce<Record<string, number>>((summary, view) => {
    summary[view.field_id] = (summary[view.field_id] ?? 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts).map(([fieldId, views]) => ({ fieldId, views }));
}
