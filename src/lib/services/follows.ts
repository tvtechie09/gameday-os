import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { FieldFollowSummary, FollowType } from "@/lib/types";
import { getOrganizationDataScope } from "./organization-data-scope";

export type CreateFollowInput = {
  fieldId: string;
  sessionId?: string | null;
  followType: FollowType;
  displayName?: string | null;
};

function sanitizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : null;
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

function readFollowType(value: string): FollowType {
  return value === "session" ? "session" : "field";
}

export async function createFollow(input: CreateFollowInput) {
  const supabase = getSupabaseAdminClient();
  const followType = readFollowType(input.followType);
  const { error } = await supabase.from("follows").insert({
    display_name: sanitizeText(input.displayName),
    field_id: input.fieldId,
    follow_type: followType,
    session_id: followType === "session" ? input.sessionId ?? null : null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getFollowCountSince(since: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const scope = await getOrganizationDataScope();
  let query = supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (scope) {
    if (scope.fieldIds.size === 0) {
      return 0;
    }

    query = query.in("field_id", [...scope.fieldIds]);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getFollowDashboardCounts() {
  const [today, last7Days] = await Promise.all([
    getFollowCountSince(startOfToday()),
    getFollowCountSince(daysAgo(7)),
  ]);

  return { today, last7Days };
}

export async function getFollowCountsByField(): Promise<FieldFollowSummary[]> {
  // Analytics counts are decoration on the fields list; never take the page down
  // when the admin client is unavailable in this environment.
  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return [];
  }
  const scope = await getOrganizationDataScope();
  let query = supabase
    .from("follows")
    .select("field_id");

  if (scope) {
    if (scope.fieldIds.size === 0) {
      return [];
    }

    query = query.in("field_id", [...scope.fieldIds]);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const counts = (data ?? []).reduce<Record<string, number>>((summary, follow) => {
    summary[follow.field_id] = (summary[follow.field_id] ?? 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts).map(([fieldId, follows]) => ({ fieldId, follows }));
}

export async function getFollowCountForSession(sessionId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
