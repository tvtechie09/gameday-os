import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import type { Database, Json } from "@/lib/supabase/types";
import type { Session, SessionLinkLabel, SessionSportType, SyncJob, SyncJobStatus, SyncQueueItem, SyncQueueReviewStatus } from "@/lib/types";
import { getAuthorizedExternalSource } from "./external-sources";
import { assertActorUserId, PermissionDeniedError, requirePermission, safelyLogAudit } from "./identity";
import { createSession, getSessionsByFieldId } from "./sessions";
import { syncQueueFieldScopeError, syncQueueSourceVenueError, type SyncQueueFieldTarget } from "./sync-queue-scope";
import { getScopedSyncReadIds } from "./sync-read-scope";

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
const syncQueueSelect = "id,sync_job_id,venue_id,source_record_id,source_data,review_status,created_at";

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
    venueId: row.venue_id,
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

function readFieldId(value: unknown) {
  if (!isRecord(value) || value.kind !== "session" || !isRecord(value.session)) return null;
  return typeof value.session.field_id === "string" ? value.session.field_id.trim() || null : null;
}

async function loadCanonicalSyncFields(fieldIds: string[]): Promise<SyncQueueFieldTarget[]> {
  const uniqueFieldIds = [...new Set(fieldIds.map((id) => id.trim()).filter(Boolean))];
  const { data, error } = uniqueFieldIds.length
    ? await getSupabaseAdminClient().from("fields").select("id,venue_id").in("id", uniqueFieldIds)
    : { data: [], error: null };
  if (error) throw new Error(error.message);
  const fields = (data ?? []).map((field) => ({ id: field.id, venueId: field.venue_id }));
  const scopeError = syncQueueFieldScopeError(fieldIds, fields);
  if (scopeError) throw new PermissionDeniedError(scopeError);
  return fields;
}

async function authorizeSyncFields(actor: string, fields: SyncQueueFieldTarget[]) {
  for (const venueId of new Set(fields.map((field) => field.venueId))) {
    await requirePermission(actor, "integrations.sync", "venue", venueId);
  }
}

async function getAuthorizedSyncQueueItem(id: string, actor: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("sync_queue").select(syncQueueSelect).eq("id", id.trim()).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new PermissionDeniedError("Sync queue item is not available in this scope.");
  const item = mapSyncQueueItem(data);
  const fieldId = readFieldId(item.sourceData);
  if (!fieldId) throw new PermissionDeniedError("Sync queue item is missing a canonical field target.");
  const [field] = await loadCanonicalSyncFields([fieldId]);
  if (!item.venueId || item.venueId !== field.venueId) {
    throw new PermissionDeniedError("Sync queue ownership does not match its canonical field.");
  }
  await authorizeSyncFields(actor, [field]);
  return { field, item };
}

export function getSyncStatusLabel(status: SyncJobStatus | SyncQueueReviewStatus) {
  return status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function createSyncJobWithQueue(data: CreateSyncJobInput, actorUserId: string): Promise<SyncJob> {
  const actor = assertActorUserId(actorUserId);
  const fields = await loadCanonicalSyncFields(data.records.map((record) => record.sourceData.session.field_id));
  await authorizeSyncFields(actor, fields);
  if (data.sourceId) {
    const source = await getAuthorizedExternalSource(data.sourceId, actor, "integrations.sync");
    const sourceScopeError = syncQueueSourceVenueError(source.venueId, fields);
    if (sourceScopeError) throw new PermissionDeniedError(sourceScopeError);
  }
  const supabase = getSupabaseAdminClient();
  const { data: job, error } = await supabase
    .from("sync_jobs")
    .insert({
      completed_at: new Date().toISOString(),
      records_found: data.recordsFound,
      records_imported: 0,
      records_skipped: data.recordsSkipped ?? 0,
      source_id: data.sourceId ?? null,
      source_type: data.sourceType,
      status: "completed",
    })
    .select(syncJobSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (data.records.length > 0) {
    const venueByFieldId = new Map(fields.map((field) => [field.id, field.venueId]));
    const { error: queueError } = await supabase
      .from("sync_queue")
      .insert(data.records.map((record) => {
        const venueId = venueByFieldId.get(record.sourceData.session.field_id.trim());
        if (!venueId) throw new PermissionDeniedError("Sync queue field ownership is not available.");
        return {
          review_status: "pending",
          source_data: record.sourceData as Json,
          source_record_id: record.sourceRecordId,
          sync_job_id: job.id,
          venue_id: venueId,
        };
      }));

    if (queueError) {
      await supabase.from("sync_jobs").update({ status: "failed" }).eq("id", job.id);
      throw new Error(queueError.message);
    }
  }

  const syncJob = mapSyncJob(job);
  for (const venueId of new Set(fields.map((field) => field.venueId))) {
    await safelyLogAudit({ action: "integration.sync_job_create", actorUserId: actor, metadata: { recordsFound: data.recordsFound, sourceType: data.sourceType }, resourceId: syncJob.id, resourceType: "sync_job", scopeId: venueId, scopeType: "venue" });
  }
  return syncJob;
}

async function loadScopedSyncSnapshot(status?: SyncQueueReviewStatus | "all") {
  const supabase = getSupabaseAdminClient();
  const [scope, jobsResult, queueResult, ownershipResult] = await Promise.all([
    getScopedVenuesAndFields(),
    supabase.from("sync_jobs").select(syncJobSelect).order("created_at", { ascending: false }),
    supabase.from("sync_queue").select(syncQueueSelect).order("created_at", { ascending: false }),
    supabase.from("sync_job_venues").select("sync_job_id,venue_id"),
  ]);
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (queueResult.error) throw new Error(queueResult.error.message);
  if (ownershipResult.error) throw new Error(ownershipResult.error.message);

  const jobs = (jobsResult.data ?? []).map(mapSyncJob);
  const queue = (queueResult.data ?? []).map(mapSyncQueueItem);

  const { jobIds, queueIds } = getScopedSyncReadIds({
    allowedVenueIds: new Set(scope.venues.map((venue) => venue.id)),
    jobVenues: (ownershipResult.data ?? []).map((ownership) => ({
      syncJobId: ownership.sync_job_id,
      venueId: ownership.venue_id,
    })),
    jobs,
    queue: queue.map((item) => ({ id: item.id, syncJobId: item.syncJobId, venueId: item.venueId })),
  });

  return {
    jobs: jobs.filter((job) => jobIds.has(job.id)),
    queue: queue.filter((item) => queueIds.has(item.id) && (!status || status === "all" || item.reviewStatus === status)),
  };
}

export async function getSyncJobs(): Promise<SyncJob[]> {
  return (await loadScopedSyncSnapshot()).jobs;
}

export async function getSyncQueueItems(status?: SyncQueueReviewStatus | "all"): Promise<SyncQueueItem[]> {
  return (await loadScopedSyncSnapshot(status)).queue;
}

export async function getSyncDashboardStats(): Promise<SyncDashboardStats> {
  const { jobs, queue: pendingQueue } = await loadScopedSyncSnapshot("pending");
  return {
    failedJobs: jobs.filter((job) => job.status === "failed").length,
    lastSync: jobs.find((job) => job.completedAt)?.completedAt ?? jobs[0]?.createdAt ?? null,
    pendingReviewItems: pendingQueue.length,
  };
}

export async function updateSyncQueueReviewStatus(id: string, status: Exclude<SyncQueueReviewStatus, "imported">, actorUserId: string): Promise<SyncQueueItem> {
  const actor = assertActorUserId(actorUserId);
  const { field, item } = await getAuthorizedSyncQueueItem(id, actor);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_queue")
    .update({ review_status: status })
    .eq("id", item.id)
    .eq("sync_job_id", item.syncJobId)
    .select(syncQueueSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updatedItem = mapSyncQueueItem(data);
  await safelyLogAudit({ action: "integration.sync_queue_review", actorUserId: actor, metadata: { status }, resourceId: updatedItem.id, resourceType: "sync_queue_item", scopeId: field.venueId, scopeType: "venue" });
  return updatedItem;
}

export async function importSyncQueueItem(id: string, actorUserId: string): Promise<ImportSyncQueueResult> {
  const actor = assertActorUserId(actorUserId);
  const { field, item } = await getAuthorizedSyncQueueItem(id, actor);
  const supabase = getSupabaseAdminClient();
  const queuedSession = readSessionPayload(item.sourceData);
  if (!queuedSession) {
    await supabase.from("sync_queue").update({ review_status: "rejected" }).eq("id", item.id).eq("sync_job_id", item.syncJobId);
    return { errors: ["Queue item is not a valid session record."], imported: 0, skipped: 0 };
  }
  const session = { ...queuedSession, field_id: field.id };

  const existingSessions = await getSessionsByFieldId(field.id);
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
    await supabase.from("sync_queue").update({ review_status: "imported" }).eq("id", item.id).eq("sync_job_id", item.syncJobId);
    await supabase.from("sync_jobs").update({ records_skipped: await nextJobCount(item.syncJobId, "records_skipped") }).eq("id", item.syncJobId);
    return { errors: [], imported: 0, skipped: 1 };
  }

  try {
    await createSession({
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
    await supabase.from("sync_queue").update({ review_status: "imported" }).eq("id", item.id).eq("sync_job_id", item.syncJobId);
    await supabase.from("sync_jobs").update({ records_imported: await nextJobCount(item.syncJobId, "records_imported") }).eq("id", item.syncJobId);
    await safelyLogAudit({ action: "integration.sync_queue_import", actorUserId: actor, resourceId: item.id, resourceType: "sync_queue_item", scopeId: field.venueId, scopeType: "venue" });
    return { errors: [], imported: 1, skipped: 0 };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "Unable to import sync record."], imported: 0, skipped: 0 };
  }
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
