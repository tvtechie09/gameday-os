import type { SupabaseClient } from "@supabase/supabase-js";
import { getScoreboardEventTypes, hashScoreboardState, isScoreboardReadingStale, normalizeDaktronicsReadingPayload, validateDaktronicsAdapterToken, type NormalizedScoreboardState, type ScoreboardEventType } from "../daktronics-scoreboard-core.ts";
import { PermissionDeniedError, assertActorUserId, requirePermission, safelyLogAudit } from "./identity.ts";
import { getSupabaseAdminClient } from "../supabase/server.ts";
import type { Json } from "../supabase/types.ts";

export type ScoreboardDeviceStatus = "configured" | "connected" | "stale" | "offline" | "error" | "disabled";
export type ScoreboardConnectionType = "network" | "serial" | "controller_bridge" | "local_adapter" | "unknown";
export type DaktronicsReadingPayload = Partial<NormalizedScoreboardState> & {
  adapterKey?: string;
  deviceId?: string;
  fieldId?: string;
  isOfficial?: boolean;
  readAt?: string;
  sessionId?: string | null;
  rawPayload?: Json;
};

export type ScoreboardDevice = {
  adapterKey: string | null;
  connectionType: ScoreboardConnectionType;
  controllerModel: string | null;
  fieldId: string | null;
  id: string;
  ipAddress: string | null;
  lastSeenAt: string | null;
  manufacturer: string;
  model: string;
  serialPort: string | null;
  sport: string;
  status: ScoreboardDeviceStatus;
  venueId: string;
};

export type ScoreboardReading = NormalizedScoreboardState & {
  createdAt: string;
  deviceId: string;
  fieldId: string | null;
  id: string;
  isOfficial: boolean;
  payloadHash: string;
  readAt: string;
  sessionId: string | null;
  source: string;
  venueId: string;
};

type DeviceRow = { id: string; organization_id: string | null; venue_id: string; field_id: string | null; manufacturer: string; model: string; controller_model: string | null; sport: string; connection_type: ScoreboardConnectionType; ip_address: string | null; serial_port: string | null; status: ScoreboardDeviceStatus; last_seen_at: string | null; adapter_key: string | null; is_read_only: boolean; notes: string | null; created_at: string; updated_at: string };
type ConnectionRow = { id: string; device_id: string; provider_key: string; connection_status: ScoreboardDeviceStatus; adapter_version: string | null; adapter_host: string | null; last_connected_at: string | null; last_read_at: string | null; last_error: string | null; created_at: string; updated_at: string };
type ReadingRow = { id: string; device_id: string; connection_id: string | null; venue_id: string; field_id: string | null; session_id: string | null; source: string; home_score: number; away_score: number; period_label: string | null; inning: number | null; top_bottom: "top" | "bottom" | null; balls: number | null; strikes: number | null; outs: number | null; game_clock: string | null; shot_clock: string | null; possession: string | null; status: string; raw_payload: Json; payload_hash: string; is_official: boolean; read_at: string; created_at: string };
type EventRow = { id: string; device_id: string; reading_id: string | null; venue_id: string; field_id: string | null; session_id: string | null; event_type: ScoreboardEventType; event_message: string; previous_state: Json | null; current_state: Json; created_at: string };
type LogRow = { id: string; device_id: string | null; connection_id: string | null; log_level: "debug" | "info" | "warning" | "error"; message: string; metadata: Json; created_at: string };

type ScoreboardTables = {
  scoreboard_devices: { Row: DeviceRow; Insert: Partial<DeviceRow> & Pick<DeviceRow, "venue_id" | "model">; Update: Partial<DeviceRow>; Relationships: [] };
  scoreboard_connections: { Row: ConnectionRow; Insert: Partial<ConnectionRow> & Pick<ConnectionRow, "device_id">; Update: Partial<ConnectionRow>; Relationships: [] };
  scoreboard_readings: { Row: ReadingRow; Insert: Partial<ReadingRow> & Pick<ReadingRow, "device_id" | "venue_id" | "payload_hash">; Update: Partial<ReadingRow>; Relationships: [] };
  scoreboard_events: { Row: EventRow; Insert: Partial<EventRow> & Pick<EventRow, "device_id" | "venue_id" | "event_type" | "event_message">; Update: Partial<EventRow>; Relationships: [] };
  scoreboard_adapter_logs: { Row: LogRow; Insert: Partial<LogRow> & Pick<LogRow, "message">; Update: Partial<LogRow>; Relationships: [] };
};

type ScoreboardDatabase = { public: { Tables: ScoreboardTables; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
type ScoreboardClient = SupabaseClient<ScoreboardDatabase>;

const deviceSelect = "id,organization_id,venue_id,field_id,manufacturer,model,controller_model,sport,connection_type,ip_address,serial_port,status,last_seen_at,adapter_key,is_read_only,notes,created_at,updated_at";
const connectionSelect = "id,device_id,provider_key,connection_status,adapter_version,adapter_host,last_connected_at,last_read_at,last_error,created_at,updated_at";
const readingSelect = "id,device_id,connection_id,venue_id,field_id,session_id,source,home_score,away_score,period_label,inning,top_bottom,balls,strikes,outs,game_clock,shot_clock,possession,status,raw_payload,payload_hash,is_official,read_at,created_at";
const logSelect = "id,device_id,connection_id,log_level,message,metadata,created_at";

function getClient() { return getSupabaseAdminClient() as unknown as ScoreboardClient; }
function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }

export { getScoreboardEventTypes, hashScoreboardState, isScoreboardReadingStale, normalizeDaktronicsReadingPayload, validateDaktronicsAdapterToken };

function mapDevice(row: DeviceRow): ScoreboardDevice { return { adapterKey: row.adapter_key, connectionType: row.connection_type, controllerModel: row.controller_model, fieldId: row.field_id, id: row.id, ipAddress: row.ip_address, lastSeenAt: row.last_seen_at, manufacturer: row.manufacturer, model: row.model, serialPort: row.serial_port, sport: row.sport, status: row.status, venueId: row.venue_id }; }
function mapReading(row: ReadingRow): ScoreboardReading { return { awayScore: row.away_score, balls: row.balls, createdAt: row.created_at, deviceId: row.device_id, fieldId: row.field_id, gameClock: row.game_clock, homeScore: row.home_score, id: row.id, inning: row.inning, isOfficial: row.is_official, outs: row.outs, payloadHash: row.payload_hash, periodLabel: row.period_label, possession: row.possession, readAt: row.read_at, sessionId: row.session_id, shotClock: row.shot_clock, source: row.source, status: row.status, strikes: row.strikes, topBottom: row.top_bottom, venueId: row.venue_id }; }

export async function createScoreboardDevice(input: { adapterKey?: string | null; connectionType: ScoreboardConnectionType; controllerModel?: string | null; fieldId?: string | null; ipAddress?: string | null; manufacturer?: string; model: string; organizationId?: string | null; serialPort?: string | null; sport: string; venueId: string }, actorUserId: string) {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "integrations.edit", "venue", input.venueId);
  const supabase = getClient();
  const { data, error } = await supabase.from("scoreboard_devices").insert({ adapter_key: text(input.adapterKey), connection_type: input.connectionType, controller_model: text(input.controllerModel), field_id: text(input.fieldId), ip_address: text(input.ipAddress), manufacturer: input.manufacturer ?? "Daktronics", model: input.model, organization_id: text(input.organizationId), serial_port: text(input.serialPort), sport: input.sport, status: "configured", venue_id: input.venueId }).select(deviceSelect).single();
  if (error) throw new Error(error.message);
  const device = mapDevice(data as unknown as DeviceRow);
  await safelyLogAudit({ action: "scoreboard.device.created", actorUserId: actor, metadata: { manufacturer: device.manufacturer, model: device.model, readOnly: true }, resourceId: device.id, resourceType: "scoreboard_device", scopeId: device.venueId, scopeType: "venue" });
  return device;
}

export async function getScoreboardDevices(actorUserId?: string) {
  const supabase = getClient();
  const { data, error } = await supabase.from("scoreboard_devices").select(deviceSelect).order("updated_at", { ascending: false });
  if (error) {
    console.error("Failed to load scoreboard devices", error);
    return [];
  }
  const devices = ((data ?? []) as unknown as DeviceRow[]).map(mapDevice);
  if (!actorUserId) return devices;
  const actor = assertActorUserId(actorUserId);
  const visible: ScoreboardDevice[] = [];
  for (const device of devices) {
    try { await requirePermission(actor, "integrations.view", "venue", device.venueId); visible.push(device); } catch (error) { if (!(error instanceof PermissionDeniedError)) throw error; }
  }
  return visible;
}

export async function getLatestScoreboardReadings() {
  const supabase = getClient();
  const { data: devices, error } = await supabase.from("scoreboard_devices").select(deviceSelect).order("updated_at", { ascending: false });
  if (error) {
    console.error("Failed to load scoreboard devices for latest readings", error);
    return [];
  }
  const results: Array<{ device: ScoreboardDevice; latestReading: ScoreboardReading | null; isStale: boolean }> = [];
  for (const deviceRow of (devices ?? []) as unknown as DeviceRow[]) {
    const { data } = await supabase.from("scoreboard_readings").select(readingSelect).eq("device_id", deviceRow.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const latestReading = data ? mapReading(data as unknown as ReadingRow) : null;
    results.push({ device: mapDevice(deviceRow), isStale: isScoreboardReadingStale(latestReading?.readAt ?? deviceRow.last_seen_at), latestReading });
  }
  return results;
}

async function writeAdapterLog(message: string, metadata: Json, level: LogRow["log_level"] = "info", deviceId?: string | null, connectionId?: string | null) {
  const supabase = getClient();
  const { error } = await supabase.from("scoreboard_adapter_logs").insert({ connection_id: connectionId ?? null, device_id: deviceId ?? null, log_level: level, message, metadata });
  if (error) console.error("Failed to write scoreboard adapter log", error);
}

export async function ingestDaktronicsReading(payload: DaktronicsReadingPayload, requestMeta: { adapterHost?: string | null; adapterVersion?: string | null } = {}) {
  const deviceKey = text(payload.deviceId) ? { column: "id", value: text(payload.deviceId)! } : text(payload.adapterKey) ? { column: "adapter_key", value: text(payload.adapterKey)! } : null;
  if (!deviceKey) throw new Error("Missing scoreboard deviceId or adapterKey.");
  const supabase = getClient();
  const { data: deviceData, error: deviceError } = await supabase.from("scoreboard_devices").select(deviceSelect).eq(deviceKey.column, deviceKey.value).maybeSingle();
  if (deviceError) throw new Error(deviceError.message);
  if (!deviceData) throw new Error("Scoreboard device is not registered.");
  const device = deviceData as unknown as DeviceRow;
  if (!device.is_read_only) throw new Error("Scoreboard device must be read-only for Daktronics reading ingestion.");

  const state = normalizeDaktronicsReadingPayload(payload);
  const payloadHash = hashScoreboardState(state);
  const readAt = text(payload.readAt) ?? new Date().toISOString();
  const { data: previousData } = await supabase.from("scoreboard_readings").select(readingSelect).eq("device_id", device.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const previousReading = previousData ? mapReading(previousData as unknown as ReadingRow) : null;
  if (previousReading?.payloadHash === payloadHash) {
    await supabase.from("scoreboard_devices").update({ last_seen_at: readAt, status: "connected", updated_at: new Date().toISOString() }).eq("id", device.id);
    await writeAdapterLog("Duplicate Daktronics reading accepted without creating events.", { payloadHash }, "debug", device.id);
    return { duplicate: true, events: [], reading: previousReading };
  }

  const { data: connectionData } = await supabase.from("scoreboard_connections").select(connectionSelect).eq("device_id", device.id).maybeSingle();
  const connection = connectionData as unknown as ConnectionRow | null;
  const connectionId = connection?.id ?? null;
  if (connection) {
    await supabase.from("scoreboard_connections").update({ adapter_host: requestMeta.adapterHost ?? connection.adapter_host, adapter_version: requestMeta.adapterVersion ?? connection.adapter_version, connection_status: "connected", last_read_at: readAt, updated_at: new Date().toISOString() }).eq("id", connection.id);
  } else {
    await supabase.from("scoreboard_connections").insert({ adapter_host: requestMeta.adapterHost ?? null, adapter_version: requestMeta.adapterVersion ?? null, connection_status: "connected", device_id: device.id, last_connected_at: readAt, last_read_at: readAt, provider_key: "daktronics" });
  }

  const { data: readingData, error: readingError } = await supabase.from("scoreboard_readings").insert({ away_score: state.awayScore, balls: state.balls, connection_id: connectionId, device_id: device.id, field_id: payload.fieldId ?? device.field_id, game_clock: state.gameClock, home_score: state.homeScore, inning: state.inning, is_official: Boolean(payload.isOfficial), outs: state.outs, payload_hash: payloadHash, period_label: state.periodLabel, possession: state.possession, raw_payload: payload.rawPayload ?? payload as Json, read_at: readAt, session_id: payload.sessionId ?? null, shot_clock: state.shotClock, source: "daktronics_readonly", status: state.status, strikes: state.strikes, top_bottom: state.topBottom, venue_id: device.venue_id }).select(readingSelect).single();
  if (readingError) throw new Error(readingError.message);
  const reading = mapReading(readingData as unknown as ReadingRow);
  await supabase.from("scoreboard_devices").update({ last_seen_at: readAt, status: "connected", updated_at: new Date().toISOString() }).eq("id", device.id);

  const previousState = previousReading ? { awayScore: previousReading.awayScore, balls: previousReading.balls, gameClock: previousReading.gameClock, homeScore: previousReading.homeScore, inning: previousReading.inning, outs: previousReading.outs, periodLabel: previousReading.periodLabel, possession: previousReading.possession, shotClock: previousReading.shotClock, status: previousReading.status, strikes: previousReading.strikes, topBottom: previousReading.topBottom } : null;
  const eventTypes = getScoreboardEventTypes(previousState, state);
  for (const eventType of eventTypes) {
    await supabase.from("scoreboard_events").insert({ current_state: state as unknown as Json, device_id: device.id, event_message: eventType.replace("scoreboard.", "Scoreboard ").replaceAll("_", " "), event_type: eventType, field_id: reading.fieldId, previous_state: previousState as unknown as Json, reading_id: reading.id, session_id: reading.sessionId, venue_id: reading.venueId });
  }
  await writeAdapterLog("Daktronics read-only reading stored.", { eventTypes, payloadHash }, "info", device.id, connectionId);
  return { duplicate: false, events: eventTypes, reading };
}

export async function getScoreboardAdapterLogs(actorUserId: string) {
  const actor = assertActorUserId(actorUserId);
  const visibleDevices = await getScoreboardDevices(actor);
  const visibleDeviceIds = visibleDevices.map((device) => device.id);
  if (!visibleDeviceIds.length) return [];
  const supabase = getClient();
  const { data, error } = await supabase.from("scoreboard_adapter_logs").select(logSelect).in("device_id", visibleDeviceIds).order("created_at", { ascending: false }).limit(50);
  if (error) {
    console.error("Failed to load scoreboard adapter logs", error);
    return [];
  }
  return (data ?? []) as unknown as LogRow[];
}
