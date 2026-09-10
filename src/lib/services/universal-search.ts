import "server-only";

import { canManageSchedule, canViewCommandCenter, isOrgScoped, managesAllVenues, type AccessContext } from "@/lib/access/capabilities";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { searchCandidates, type UniversalSearchCandidate, type UniversalSearchResult } from "@/lib/universal-search-core";

const SOURCE_LIMIT = 120;

type FieldSearchRow = { id: string; venue_id: string; name: string; field_status: string | null; status: string | null; map_label: string | null };
type SessionSearchRow = { id: string; field_id: string; title: string; home_team: string; away_team: string; start_time: string; status: string; lifecycle_status: string | null };
type WorkOrderSearchRow = { id: string; venue_id: string; field_id: string | null; title: string; status: string; created_at: string };

function scopedVenueIds(ctx: AccessContext): string[] | null {
  if (managesAllVenues(ctx)) return null;
  if (isOrgScoped(ctx)) return [];
  return Array.from(new Set([...ctx.authorizedVenueIds, ...(ctx.venueId ? [ctx.venueId] : [])])).filter(Boolean);
}

function shortDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Scheduled game";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export async function searchVenue(ctx: AccessContext, query: string): Promise<UniversalSearchResult[]> {
  const venueIds = scopedVenueIds(ctx);
  if (venueIds?.length === 0) return [];
  const supabase = getSupabaseAdminClient();
  let fieldQuery = supabase
    .from("fields")
    .select("id,venue_id,name,field_status,status,map_label")
    .order("updated_at", { ascending: false })
    .limit(SOURCE_LIMIT);
  if (venueIds) fieldQuery = fieldQuery.in("venue_id", venueIds);
  const { data: fieldData, error: fieldError } = await fieldQuery;
  if (fieldError) throw new Error("Search source unavailable.");
  const fields = (fieldData ?? []) as FieldSearchRow[];
  const fieldIds = fields.map((field) => field.id);
  const candidates: UniversalSearchCandidate[] = [];

  if (canViewCommandCenter(ctx)) {
    for (const field of fields) {
      const status = field.field_status ?? field.status ?? "open";
      candidates.push({
        type: "field",
        title: field.name,
        subtitle: field.map_label ? `${field.map_label} · ${status}` : status,
        href: `/admin/fields?fieldId=${encodeURIComponent(field.id)}`,
        status,
        relevance: 0,
        icon: "field",
        identifier: field.name.replace(/^field\s*/i, ""),
        secondary: [field.map_label ?? ""],
        current: status === "active" || status === "open",
      });
    }

    let workOrderQuery = supabase
      .from("field_work_orders")
      .select("id,venue_id,field_id,title,status,created_at")
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT);
    if (venueIds) workOrderQuery = workOrderQuery.in("venue_id", venueIds);
    const { data: workOrderData, error: workOrderError } = await workOrderQuery;
    if (workOrderError) throw new Error("Search source unavailable.");
    const fieldById = new Map(fields.map((field) => [field.id, field.name]));
    for (const order of (workOrderData ?? []) as WorkOrderSearchRow[]) {
      const fieldName = order.field_id ? fieldById.get(order.field_id) : undefined;
      candidates.push({
        type: "work_order",
        title: order.title,
        subtitle: `${fieldName ?? "Venue-wide"} · ${order.status}`,
        href: `/admin/fields/work-orders/${encodeURIComponent(order.id)}`,
        status: order.status,
        relevance: 0,
        icon: "work-order",
        identifier: `Work Order ${order.id.slice(0, 8)}`,
        secondary: [fieldName ?? "", order.status],
        current: order.status !== "resolved",
      });
    }
  }

  if (canManageSchedule(ctx) && fieldIds.length) {
    const now = Date.now();
    const historyFloor = new Date(now - 14 * 86_400_000).toISOString();
    let sessionQuery = supabase
      .from("sessions")
      .select("id,field_id,title,home_team,away_team,start_time,status,lifecycle_status")
      .in("field_id", fieldIds)
      .gte("start_time", historyFloor)
      .order("start_time", { ascending: true })
      .limit(SOURCE_LIMIT);
    const { data: sessionData, error: sessionError } = await sessionQuery;
    if (sessionError) throw new Error("Search source unavailable.");
    const fieldById = new Map(fields.map((field) => [field.id, field.name]));
    const teams = new Map<string, UniversalSearchCandidate>();
    for (const session of (sessionData ?? []) as SessionSearchRow[]) {
      const fieldName = fieldById.get(session.field_id) ?? "Field";
      const title = session.title || `${session.home_team} vs ${session.away_team}`;
      const current = session.status === "active" || (Date.parse(session.start_time) >= now - 86_400_000 && Date.parse(session.start_time) <= now + 14 * 86_400_000);
      candidates.push({
        type: "game",
        title,
        subtitle: `${shortDateTime(session.start_time)} · ${fieldName}`,
        href: `/admin/sessions/${encodeURIComponent(session.id)}`,
        status: session.lifecycle_status ?? session.status,
        relevance: 0,
        icon: "game",
        identifier: session.id,
        secondary: [session.home_team, session.away_team, fieldName, shortDateTime(session.start_time)],
        current,
      });
      for (const teamName of [session.home_team, session.away_team].filter(Boolean)) {
        const key = teamName.toLowerCase();
        if (!teams.has(key)) teams.set(key, {
          type: "team",
          title: teamName,
          subtitle: `Scheduled at ${fieldName}`,
          href: `/admin/sessions?query=${encodeURIComponent(teamName)}`,
          relevance: 0,
          icon: "team",
          secondary: [fieldName, title],
          current,
        });
      }
    }
    candidates.push(...teams.values());
  }

  return searchCandidates(candidates, query, 24);
}
