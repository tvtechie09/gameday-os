import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { AudioMode, AudioProfile, AudioProfileStatus } from "@/lib/types";
import { getCurrentOrganizationScope, getWritableOrganizationId } from "../organization-scope";

type AudioProfileRow = Database["public"]["Tables"]["audio_profiles"]["Row"];

export type CreateAudioProfileInput = {
  venue_id: string;
  field_id: string;
  session_id?: string | null;
  audio_mode: AudioMode;
  speaker_type?: string | null;
  provider?: string | null;
  status: AudioProfileStatus;
  notes?: string | null;
};

export type UpdateAudioProfileInput = CreateAudioProfileInput;

export const audioModes: AudioMode[] = ["none", "parent_speaker", "venue_pa", "bluetooth_speaker", "obs_audio", "future_integration"];
export const audioProfileStatuses: AudioProfileStatus[] = ["not_configured", "configured", "testing", "active", "offline"];

const audioProfileSelect = "id,organization_id,venue_id,field_id,session_id,audio_mode,speaker_type,provider,status,notes,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readAudioMode(value: string): AudioMode {
  return audioModes.find((mode) => mode === value) ?? "none";
}

function readAudioStatus(value: string): AudioProfileStatus {
  return audioProfileStatuses.find((status) => status === value) ?? "not_configured";
}

function isMissingAudioProfilesTableError(error: { code?: string; message?: string }) {
  return error.code === "PGRST205"
    || error.message?.includes("audio_profiles") === true
    || error.message?.includes("schema cache") === true;
}

export function getAudioModeLabel(mode: AudioMode) {
  const labels: Record<AudioMode, string> = {
    bluetooth_speaker: "Bluetooth Speaker",
    future_integration: "Future Integration",
    none: "None",
    obs_audio: "OBS Audio",
    parent_speaker: "Parent Speaker",
    venue_pa: "Venue PA",
  };

  return labels[mode];
}

export function getAudioStatusLabel(status: AudioProfileStatus) {
  const labels: Record<AudioProfileStatus, string> = {
    active: "Active",
    configured: "Configured",
    not_configured: "Not Configured",
    offline: "Offline",
    testing: "Testing",
  };

  return labels[status];
}

export function getAudioStatusClass(status: AudioProfileStatus) {
  if (status === "active") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }

  if (status === "testing" || status === "configured") {
    return "bg-blue-50 text-blue-800";
  }

  if (status === "offline") {
    return "bg-red-100 text-red-900";
  }

  return "bg-slate-100 text-slate-700";
}

function mapAudioProfile(row: AudioProfileRow): AudioProfile {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    venueId: row.venue_id,
    fieldId: row.field_id,
    sessionId: readOptionalText(row.session_id),
    audioMode: readAudioMode(row.audio_mode),
    speakerType: readOptionalText(row.speaker_type),
    provider: readOptionalText(row.provider),
    status: readAudioStatus(row.status),
    notes: readOptionalText(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAudioProfiles(): Promise<AudioProfile[]> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase
    .from("audio_profiles")
    .select(audioProfileSelect)
    .order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingAudioProfilesTableError(error)) {
      console.error("audio_profiles table is unavailable; returning no audio profiles.", error);
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map(mapAudioProfile);
}

export async function getAudioProfile(id: string): Promise<AudioProfile | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("audio_profiles")
    .select(audioProfileSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingAudioProfilesTableError(error)) {
      console.error("audio_profiles table is unavailable; returning no audio profile.", error);
      return null;
    }

    throw new Error(error.message);
  }

  return data ? mapAudioProfile(data) : null;
}

export async function getAudioProfileForField({ fieldId, sessionId }: { fieldId: string; sessionId?: string | null }): Promise<AudioProfile | null> {
  const profiles = await getAudioProfiles();
  const fieldProfiles = profiles.filter((profile) => profile.fieldId === fieldId);

  if (sessionId) {
    return fieldProfiles.find((profile) => profile.sessionId === sessionId)
      ?? fieldProfiles.find((profile) => !profile.sessionId)
      ?? null;
  }

  return fieldProfiles.find((profile) => !profile.sessionId) ?? fieldProfiles[0] ?? null;
}

export async function createAudioProfile(data: CreateAudioProfileInput): Promise<AudioProfile> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getOrganizationIdForVenue(data.venue_id);
  const { data: profile, error } = await supabase
    .from("audio_profiles")
    .insert({
      organization_id: organizationId,
      venue_id: data.venue_id,
      field_id: data.field_id,
      session_id: readOptionalText(data.session_id),
      audio_mode: data.audio_mode,
      speaker_type: readOptionalText(data.speaker_type),
      provider: readOptionalText(data.provider),
      status: data.status,
      notes: readOptionalText(data.notes),
    })
    .select(audioProfileSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAudioProfile(profile);
}

export async function updateAudioProfile(id: string, data: UpdateAudioProfileInput): Promise<AudioProfile> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getOrganizationIdForVenue(data.venue_id);
  const { data: profile, error } = await supabase
    .from("audio_profiles")
    .update({
      organization_id: organizationId,
      venue_id: data.venue_id,
      field_id: data.field_id,
      session_id: readOptionalText(data.session_id),
      audio_mode: data.audio_mode,
      speaker_type: readOptionalText(data.speaker_type),
      provider: readOptionalText(data.provider),
      status: data.status,
      notes: readOptionalText(data.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(audioProfileSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAudioProfile(profile);
}

async function getOrganizationIdForVenue(venueId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select("organization_id")
    .eq("id", venueId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load venue organization for audio profile", error);
  }

  return data?.organization_id ?? await getWritableOrganizationId();
}
