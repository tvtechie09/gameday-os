import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ScoreboardAdapter, ScoreboardAdapterStatus, ScoreboardAdapterType } from "@/lib/types";
import { getScoreboardProfiles } from "./scoreboards";

type ScoreboardAdapterRow = Database["public"]["Tables"]["scoreboard_adapters"]["Row"];

export type CreateScoreboardAdapterInput = {
  scoreboard_id: string;
  adapter_type: ScoreboardAdapterType;
  adapter_status?: ScoreboardAdapterStatus;
  notes?: string | null;
};

export const scoreboardAdapterTypes: ScoreboardAdapterType[] = ["manual", "daktronics", "nevco", "fairplay", "musco", "custom"];
export const scoreboardAdapterStatuses: ScoreboardAdapterStatus[] = ["inactive", "configured", "testing", "active", "error"];

const adapterSelect = "id,scoreboard_id,adapter_type,adapter_status,last_sync_at,notes";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readAdapterType(value: string): ScoreboardAdapterType {
  return scoreboardAdapterTypes.find((type) => type === value) ?? "manual";
}

function readAdapterStatus(value: string): ScoreboardAdapterStatus {
  return scoreboardAdapterStatuses.find((status) => status === value) ?? "inactive";
}

function mapScoreboardAdapter(row: ScoreboardAdapterRow): ScoreboardAdapter {
  return {
    id: row.id,
    scoreboardId: row.scoreboard_id,
    adapterType: readAdapterType(row.adapter_type),
    adapterStatus: readAdapterStatus(row.adapter_status),
    lastSyncAt: readOptionalText(row.last_sync_at),
    notes: readOptionalText(row.notes),
  };
}

export function getScoreboardAdapterTypeLabel(type: ScoreboardAdapterType) {
  const labels: Record<ScoreboardAdapterType, string> = {
    custom: "Custom",
    daktronics: "Daktronics",
    fairplay: "Fair-Play",
    manual: "Manual",
    musco: "Musco",
    nevco: "Nevco",
  };

  return labels[type];
}

export function getScoreboardAdapterStatusLabel(status: ScoreboardAdapterStatus) {
  const labels: Record<ScoreboardAdapterStatus, string> = {
    active: "Active",
    configured: "Configured",
    error: "Error",
    inactive: "Inactive",
    testing: "Testing",
  };

  return labels[status];
}

export function getScoreboardAdapterStatusClass(status: ScoreboardAdapterStatus) {
  if (status === "active") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }

  if (status === "testing" || status === "configured") {
    return "bg-blue-50 text-blue-800";
  }

  if (status === "error") {
    return "bg-red-100 text-red-900";
  }

  return "bg-slate-100 text-slate-700";
}

export async function getScoreboardAdapters(): Promise<ScoreboardAdapter[]> {
  const [profiles, adapters] = await Promise.all([
    getScoreboardProfiles(),
    readAllScoreboardAdapters(),
  ]);
  const visibleProfileIds = new Set(profiles.map((profile) => profile.id));
  return adapters.filter((adapter) => visibleProfileIds.has(adapter.scoreboardId));
}

async function readAllScoreboardAdapters(): Promise<ScoreboardAdapter[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("scoreboard_adapters")
    .select(adapterSelect)
    .order("adapter_type", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapScoreboardAdapter);
}

export async function createScoreboardAdapter(data: CreateScoreboardAdapterInput): Promise<ScoreboardAdapter> {
  const supabase = getSupabaseAdminClient();
  const { data: adapter, error } = await supabase
    .from("scoreboard_adapters")
    .insert({
      scoreboard_id: data.scoreboard_id,
      adapter_type: data.adapter_type,
      adapter_status: data.adapter_status ?? "configured",
      notes: readOptionalText(data.notes),
    })
    .select(adapterSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapScoreboardAdapter(adapter);
}

export async function runScoreboardAdapterTest(id: string): Promise<ScoreboardAdapter> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scoreboard_adapters")
    .update({
      adapter_status: "testing",
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(adapterSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapScoreboardAdapter(data);
}
