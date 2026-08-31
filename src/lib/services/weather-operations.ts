import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/services/identity";

export type VenueWeatherOperationStatus = "normal" | "monitoring" | "hold" | "evacuating" | "restart_countdown" | "all_clear";

export type VenueWeatherOperation = {
  venueId: string;
  status: VenueWeatherOperationStatus;
  message: string;
  affectedFieldIds: string[];
  restartNotBefore: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  startedAt: string;
  updatedAt: string;
};

type WeatherRow = {
  venue_id: string;
  status: string;
  message: string;
  affected_field_ids: string[] | null;
  restart_not_before: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  started_at: string;
  updated_at: string;
};

type WeatherOperationsClient = {
  from: (table: string) => {
    select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: WeatherRow | null; error: { message: string } | null }> } };
    upsert: (value: Record<string, unknown>, options: { onConflict: string }) => { select: (columns: string) => { single: () => Promise<{ data: WeatherRow; error: { message: string } | null }> } };
  };
};

const select = "venue_id,status,message,affected_field_ids,restart_not_before,acknowledged_at,acknowledged_by,started_at,updated_at";
const statuses: VenueWeatherOperationStatus[] = ["normal", "monitoring", "hold", "evacuating", "restart_countdown", "all_clear"];

function map(row: WeatherRow): VenueWeatherOperation {
  return {
    venueId: row.venue_id,
    status: statuses.find((status) => status === row.status) ?? "normal",
    message: row.message,
    affectedFieldIds: row.affected_field_ids ?? [],
    restartNotBefore: row.restart_not_before,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
  };
}

export async function getVenueWeatherOperation(venueId: string): Promise<VenueWeatherOperation | null> {
  const supabase = getSupabaseAdminClient() as unknown as WeatherOperationsClient;
  const { data, error } = await supabase.from("venue_weather_operations").select(select).eq("venue_id", venueId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? map(data as WeatherRow) : null;
}

export async function setVenueWeatherOperation(input: {
  venueId: string;
  status: VenueWeatherOperationStatus;
  message: string;
  affectedFieldIds?: string[];
  restartNotBefore?: string | null;
  acknowledge?: boolean;
}, actorUserId: string): Promise<VenueWeatherOperation> {
  await requirePermission(actorUserId, "venue.alert.send", "venue", input.venueId);
  const now = new Date().toISOString();
  const supabase = getSupabaseAdminClient() as unknown as WeatherOperationsClient;
  const { data, error } = await supabase.from("venue_weather_operations").upsert({
    venue_id: input.venueId,
    status: input.status,
    message: input.message.trim().slice(0, 500),
    affected_field_ids: [...new Set(input.affectedFieldIds ?? [])].slice(0, 100),
    restart_not_before: input.restartNotBefore ?? null,
    acknowledged_at: input.acknowledge ? now : null,
    acknowledged_by: input.acknowledge ? actorUserId : null,
    updated_by: actorUserId,
    started_at: now,
    updated_at: now,
  }, { onConflict: "venue_id" }).select(select).single();
  if (error) throw new Error(error.message);
  return map(data as WeatherRow);
}
