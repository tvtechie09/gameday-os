import type { SessionSportType } from "@/lib/types";
import { getIntegrationProvider, getProviderEnvStatus } from "@/lib/integration-framework";

export type SportsEngineConnectionStatus = "not_configured" | "credentials_missing" | "ready_to_connect" | "connected" | "sync_error" | "disconnected";
export type SportsEngineSyncStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type SportsEngineEventStatus = "scheduled" | "delayed" | "moved" | "final" | "cancelled";

export type GameDayScheduleEvent = {
  external_event_id: string;
  external_org_id: string;
  external_venue_id: string;
  external_field_id: string;
  external_field_name: string;
  game_date: string;
  start_time: string;
  end_time: string | null;
  home_team: string;
  away_team: string;
  division: string | null;
  sport: SessionSportType;
  status: SportsEngineEventStatus;
  source: "sportsengine";
  raw: Record<string, unknown>;
};

export type SportsEngineCredentialState = {
  status: SportsEngineConnectionStatus;
  missingEnvVars: string[];
  configuredEnvVars: string[];
  message: string;
};

export function getSportsEngineCredentialState(env: Record<string, string | undefined> = process.env): SportsEngineCredentialState {
  const provider = getIntegrationProvider("sportsengine");
  if (!provider) {
    return { configuredEnvVars: [], message: "SportsEngine provider is not registered.", missingEnvVars: [], status: "not_configured" };
  }

  const status = getProviderEnvStatus(provider, env);
  return {
    configuredEnvVars: status.configuredEnvVars,
    message: status.message,
    missingEnvVars: status.missingEnvVars,
    status: status.status === "ready_to_connect" ? "ready_to_connect" : status.status === "credentials_missing" ? "credentials_missing" : "not_configured",
  };
}

export function sportsEngineStatusToSessionStatus(status: SportsEngineEventStatus) {
  if (status === "final") return "final" as const;
  return "scheduled" as const;
}

export function hasManualOverride(override: unknown) {
  return typeof override === "object" && override !== null && !Array.isArray(override) && Object.keys(override).length > 0;
}
