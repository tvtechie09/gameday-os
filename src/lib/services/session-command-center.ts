import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionMediaLink, SessionOfficial, SessionOperationsStatus } from "@/lib/types";

export type ConnectedSessionProfile = {
  awayOrganizationId: string | null;
  homeOrganizationId: string | null;
  mediaLinks: SessionMediaLink[];
  officials: SessionOfficial[];
  operationsStatus: SessionOperationsStatus;
  scoreboardProfileId: string | null;
  sponsorPackage: Record<string, unknown>;
  streamingProfile: Record<string, unknown>;
  walkupMusicProfile: Record<string, unknown>;
};

type DynamicSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
      };
    };
  };
};

const fallbackProfile: ConnectedSessionProfile = {
  awayOrganizationId: null,
  homeOrganizationId: null,
  mediaLinks: [],
  officials: [],
  operationsStatus: "normal",
  scoreboardProfileId: null,
  sponsorPackage: {},
  streamingProfile: {},
  walkupMusicProfile: {},
};

function isMissingColumnError(error: { message?: string } | null) {
  return error?.message?.includes("column") === true
    || error?.message?.includes("schema cache") === true
    || error?.message?.includes("Could not find") === true;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mediaLinks(value: unknown): SessionMediaLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): SessionMediaLink[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const label = text(record.label);
    const url = text(record.url);

    return label && url ? [{ label, type: text(record.type) as SessionMediaLink["type"], url }] : [];
  });
}

function officials(value: unknown): SessionOfficial[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): SessionOfficial[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = text(record.name);
    const role = text(record.role);

    return name && role ? [{ name, organization: text(record.organization), role }] : [];
  });
}

function operationsStatus(value: unknown): SessionOperationsStatus {
  return value === "delayed" || value === "suspended" || value === "emergency" || value === "final_review" ? value : "normal";
}

export async function getConnectedSessionProfile(sessionId: string): Promise<ConnectedSessionProfile> {
  const supabase = getSupabaseServerClient() as unknown as DynamicSupabase;
  const { data, error } = await supabase
    .from("sessions")
    .select("home_organization_id,away_organization_id,operations_status,scoreboard_profile_id,streaming_profile,walkup_music_profile,sponsor_package,media_links,officials")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) {
      console.error("Connected session columns are unavailable; returning foundation defaults.", error);
      return fallbackProfile;
    }

    throw new Error(error.message ?? "Unable to load connected session profile.");
  }

  if (!data) return fallbackProfile;

  return {
    awayOrganizationId: text(data.away_organization_id),
    homeOrganizationId: text(data.home_organization_id),
    mediaLinks: mediaLinks(data.media_links),
    officials: officials(data.officials),
    operationsStatus: operationsStatus(data.operations_status),
    scoreboardProfileId: text(data.scoreboard_profile_id),
    sponsorPackage: objectValue(data.sponsor_package),
    streamingProfile: objectValue(data.streaming_profile),
    walkupMusicProfile: objectValue(data.walkup_music_profile),
  };
}
