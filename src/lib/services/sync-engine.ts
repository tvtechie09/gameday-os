import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { Session, SessionLinkLabel, SessionSportType, SyncJob, SyncJobStatus, SyncQueueItem, SyncQueueReviewStatus } from "@/lib/types";
import { createSession, getSessions, updateImportedSessionSchedule } from "./sessions";
import { getExternalSource } from "./external-sources";
import { recordImportedSessionLineage } from "./provider-lineage";

type SyncJobRow = Database["public"]["Tables"]["sync_jobs"]["Row"];
type SyncQueueRow = Database["public"]["Tables"]["sync_queue"]["Row"];

export type SyncSessionPayload = {
  field_id: string;
  title: string;
  home_team: string;
  away_team: string;
  start_time: string;
  end_time?: string | null;
  status?: Session["status"];
  sport_type?: SessionSportType | "" | null;
  primary_link_label?: SessionLinkLabel | "" | null;
  primary_link_url?: string | null;
  secondary_link_label?: SessionLinkLabel | "" | null;
  secondary_link_url?: string | null;
  external_source?: string | null;
  external_source_id?: string | null;
  external_source_url?: string | null;
  notes?: string | null;
};

export type CreateSyncQueueRecordInput = {
  sourceRecordId: string;
  sourceData: {
    kind: "session";
    operation?: "create" | "update";
    existing_session_id?: string | null;
    changed_fields?: string[];
    session: SyncSessionPayload;
    source?: {
      field_name?: string | null;
      location?: string | null;
      provider?: string | null;
      raw?: Record<string, unknown> | null;
      source_url?: string | null;
      venue_name?: string | null;
    };
  };
};

export type CreateSyncJobInput = {
  sourceId?: string | null;
  sourceType: string;
  recordsFound: number;
  recordsSkipped?: number;
  records: CreateSyncQueueRecordInput[];
};

export type SyncDashboardStats = {
  failedJobs: number;
  lastSync: string | null;
  pendingReviewItems: number;
};

export type ImportSyncQueueResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export const syncJobStatuses: SyncJobStatus[] = ["pending", "running", "completed", "failed"];
export const syncQueueReviewStatuses: SyncQueueReviewStatus[] = ["pending", "approved", "rejected", "imported"];

const syncJobSelect = "id,source_id,source_type,status,records_found,records_imported,records_skipped,created_at,completed_at";
const syncQueueSelect = "id,sync_job_id,source_record_id,source_data,review_status,created_at";

function readJobStatus(value: string): SyncJobStatus {
  return syncJobStatuses.find((status) => status === value) ?? "pending";
}

function readQueueStatus(value: string): SyncQueueReviewStatus {
  return syncQueueReviewStatuses.find((status) => status === value) ?? "pending";
}

function mapSyncJob(row: SyncJobRow): SyncJob {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    status: readJobStatus(row.status),
    recordsFound: row.records_found,
    recordsImported: row.records_imported,
    recordsSkipped: row.records_skipped,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapSyncQueueItem(row: SyncQueueRow): SyncQueueItem {
  return {
    id: row.id,
    syncJobId: row.sync_job_id,
    sourceRecordId: row.source_record_id,
    sourceData: row.source_data,
    reviewStatus: readQueueStatus(row.review_status),
    createdAt: row.created_at,
  };
}

function duplicateKey(row: Pick<SyncSessionPayload, "away_team" | "field_id" | "home_team" | "start_time" | "title">) {
  return [
    row.field_id,
    row.title.trim().toLowerCase(),
    row.home_team.trim().toLowerCase(),
    row.away_team.trim().toLowerCase(),
    new Date(row.start_time).toISOString(),
  ].join("|");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSessionPayload(value: unknown): SyncSessionPayload | null {
  if (!isRecord(value) || value.kind !== "session" || !isRecord(value.session)) {
    return null;
  }

  const session = value.session;
  const fieldId = typeof session.field_id === "string" ? session.field_id : "";
  const title = typeof session.title === "string" ? session.title : "";
  const homeTeam = typeof session.home_team === "string" ? session.home_team : "";
  const awayTeam = typeof session.away_team === "string" ? session.away_team : "";
  const startTime = typeof session.start_time === "string" ? session.start_time : "";

  if (!fieldId || !title || !homeTeam || !awayTeam || Number.isNaN(new Date(startTime).getTime())) {
    return null;
  }

  return {
    away_team: awayTeam,
    end_time: typeof session.end_time === "string" ? session.end_time : null,
    external_source: typeof session.external_source === "string" ? session.external_source : null,
    external_source_id: typeof session.external_source_id === "string" ? session.external_source_id : null,
    external_source_url: typeof session.external_source_url === "string" ? session.external_source_url : null,
    field_id: fieldId,
    home_team: homeTeam,
    notes: typeof session.notes === "string" ? session.notes : null,
    primary_link_label: typeof session.primary_link_label === "string" ? session.primary_link_label as SessionLinkLabel : null,
    primary_link_url: typeof session.primary_link_url === "string" ? session.primary_link_url : null,
    secondary_link_label: typeof session.secondary_link_label === "string" ? session.secondary_link_label as SessionLinkLabel : null,
    secondary_link_url: typeof session.secondary_link_url === "string" ? session.secondary_link_url : null,
    sport_type: typeof session.sport_type === "string" ? session.sport_type as SessionSportType : "baseball",
    start_time: startTime,
    status: session.status === "active" || session.status === "final" || session.status === "scheduled" ? session.status : "scheduled",
    title,
  };
}

function readImportOperation(value: unknown) {
  if (!isRecord(value)) return { operation: "create" as const, existingSessionId: null };
  return {
    operation: value.operation === "update" ? "update" as const : "create" as const,
    existingSessionId: typeof value.existing_session_id === "string" ? value.existing_session_id : null,
  };
}

function readSourceRaw(value: unknown) {
  if (!isRecord(value) || !isRecord(value.source) || !isRecord(value.source.raw)) return null;
  return value.source.raw;
}

async function getJobExternalSource(jobId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("sync_jobs").select("source_id").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.source_id ? getExternalSource(data.source_id) : null;
}

export function getSyncStatusLabel(status: SyncJobStatus | SyncQueueReviewStatus) {
  return status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function createSyncJobWithQueue(data: CreateSyncJobInput): Promise<SyncJob> {
  const supabase = getSupabaseAdminClient();
  const { data: job, error } = await supabase
    .from("sync_jobs")
    .insert({
      completed_at: data.records.length > 0 ? null : new Date().toISOString(),
      records_found: data.recordsFound,
      records_imported: 0,
      records_skipped: data.recordsSkipped ?? 0,
      source_id: data.sourceId ?? null,
      source_type: data.sourceType,
      status: data.records.length > 0 ? "pending" : "completed",
    })
    .select(syncJobSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (data.records.length > 0) {
    const { error: queueError } = await supabase
      .from("sync_queue")
      .insert(data.records.map((record) => ({
        review_status: "pending",
        source_data: record.sourceData as Json,
        source_record_id: record.sourceRecordId,
        sync_job_id: job.id,
      })));

    if (queueError) {
      await supabase.from("sync_jobs").update({ status: "failed" }).eq("id", job.id);
      throw new Error(queueError.message);
    }
  }

  return mapSyncJob(job);
}

export async function getSyncJobs(): Promise<SyncJob[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .select(syncJobSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSyncJob);
}

export async function getSyncQueueItems(status?: SyncQueueReviewStatus | "all"): Promise<SyncQueueItem[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("sync_queue")
    .select(syncQueueSelect)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("review_status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSyncQueueItem);
}

export async function getSyncDashboardStats(): Promise<SyncDashboardStats> {
  const [jobs, pendingQueue] = await Promise.all([getSyncJobs(), getSyncQueueItems("pending")]);
  return {
    failedJobs: jobs.filter((job) => job.status === "failed").length,
    lastSync: jobs.find((job) => job.completedAt)?.completedAt ?? jobs[0]?.createdAt ?? null,
    pendingReviewItems: pendingQueue.length,
  };
}

export async function updateSyncQueueReviewStatus(id: string, status: Exclude<SyncQueueReviewStatus, "imported">): Promise<SyncQueueItem> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_queue")
    .update({ review_status: status })
    .eq("id", id)
    .select(syncQueueSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const item = mapSyncQueueItem(data);
  await refreshSyncJobStatus(item.syncJobId);
  return item;
}

export async function importSyncQueueItem(id: string): Promise<ImportSyncQueueResult> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_queue")
    .select(syncQueueSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return { errors: ["Queue item not found."], imported: 0, skipped: 0 };
  }

  const item = mapSyncQueueItem(data);
  const session = readSessionPayload(item.sourceData);
  if (!session) {
    await updateSyncQueueReviewStatus(id, "rejected");
    return { errors: ["Queue item is not a valid session record."], imported: 0, skipped: 0 };
  }

  const importOperation = readImportOperation(item.sourceData);
  if (importOperation.operation === "update") {
    if (!importOperation.existingSessionId) {
      await updateSyncQueueReviewStatus(id, "rejected");
      return { errors: ["The queued update is missing its matching GameDay event."], imported: 0, skipped: 0 };
    }
    try {
      const updatedSession = await updateImportedSessionSchedule(importOperation.existingSessionId, {
        away_team: session.away_team,
        end_time: session.end_time,
        external_source: session.external_source,
        external_source_id: session.external_source_id,
        external_source_url: session.external_source_url,
        field_id: session.field_id,
        home_team: session.home_team,
        notes: session.notes,
        sport_type: session.sport_type,
        start_time: session.start_time,
        title: session.title,
      });
      const externalSource = await getJobExternalSource(item.syncJobId);
      if (externalSource) await recordImportedSessionLineage({ source: externalSource, session: updatedSession, raw: readSourceRaw(item.sourceData) });
      await supabase.from("sync_queue").update({ review_status: "imported" }).eq("id", id);
      await supabase.from("sync_jobs").update({ records_imported: await nextJobCount(item.syncJobId, "records_imported") }).eq("id", item.syncJobId);
      await refreshSyncJobStatus(item.syncJobId);
      return { errors: [], imported: 1, skipped: 0 };
    } catch (error) {
      return { errors: [error instanceof Error ? error.message : "Unable to update the imported event."], imported: 0, skipped: 0 };
    }
  }

  const existingSessions = await getSessions();
  const existingSessionKeys = new Set(existingSessions.map((existingSession) => duplicateKey({
    away_team: existingSession.awayTeam,
    field_id: existingSession.fieldId,
    home_team: existingSession.homeTeam,
    start_time: existingSession.startTime,
    title: existingSession.title,
  })));
  const externalDuplicate = Boolean(session.external_source && existingSessions.some((existingSession) => {
    const sourceMatches = existingSession.externalSource === session.external_source;
    const idMatches = Boolean(session.external_source_id && existingSession.externalSourceId === session.external_source_id);
    const urlMatches = Boolean(session.external_source_url && existingSession.externalSourceUrl === session.external_source_url);
    return sourceMatches && (idMatches || urlMatches);
  }));

  if (existingSessionKeys.has(duplicateKey(session)) || externalDuplicate) {
    const matchingSession = existingSessions.find((existingSession) => existingSession.externalSource === session.external_source && (existingSession.externalSourceId === session.external_source_id || existingSession.externalSourceUrl === session.external_source_url));
    const externalSource = matchingSession ? await getJobExternalSource(item.syncJobId) : null;
    if (externalSource && matchingSession) await recordImportedSessionLineage({ source: externalSource, session: matchingSession, raw: readSourceRaw(item.sourceData) });
    await supabase.from("sync_queue").update({ review_status: "imported" }).eq("id", id);
    await supabase.from("sync_jobs").update({ records_skipped: await nextJobCount(item.syncJobId, "records_skipped") }).eq("id", item.syncJobId);
    await refreshSyncJobStatus(item.syncJobId);
    return { errors: [], imported: 0, skipped: 1 };
  }

  try {
    const createdSession = await createSession({
      away_team: session.away_team,
      end_time: session.end_time,
      external_source: session.external_source,
      external_source_id: session.external_source_id,
      external_source_url: session.external_source_url,
      field_id: session.field_id,
      home_team: session.home_team,
      notes: session.notes,
      primary_link_label: session.primary_link_label,
      primary_link_url: session.primary_link_url,
      secondary_link_label: session.secondary_link_label,
      secondary_link_url: session.secondary_link_url,
      sport_type: session.sport_type,
      start_time: session.start_time,
      status: session.status ?? "scheduled",
      title: session.title,
    });
    const externalSource = await getJobExternalSource(item.syncJobId);
    if (externalSource) await recordImportedSessionLineage({ source: externalSource, session: createdSession, raw: readSourceRaw(item.sourceData) });
    await supabase.from("sync_queue").update({ review_status: "imported" }).eq("id", id);
    await supabase.from("sync_jobs").update({ records_imported: await nextJobCount(item.syncJobId, "records_imported") }).eq("id", item.syncJobId);
    await refreshSyncJobStatus(item.syncJobId);
    return { errors: [], imported: 1, skipped: 0 };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "Unable to import sync record."], imported: 0, skipped: 0 };
  }
}

async function refreshSyncJobStatus(jobId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_queue")
    .select("review_status")
    .eq("sync_job_id", jobId);
  if (error) throw new Error(error.message);

  const isPending = (data ?? []).some((item) => item.review_status === "pending" || item.review_status === "approved");
  const nextStatus: SyncJobStatus = isPending ? "pending" : "completed";
  const { error: updateError } = await supabase
    .from("sync_jobs")
    .update({
      completed_at: isPending ? null : new Date().toISOString(),
      status: nextStatus,
    })
    .eq("id", jobId);
  if (updateError) throw new Error(updateError.message);
}

async function nextJobCount(jobId: string, column: "records_imported" | "records_skipped") {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("records_imported,records_skipped")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[column] ?? 0) + 1;
}
