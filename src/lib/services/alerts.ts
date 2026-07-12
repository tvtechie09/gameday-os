import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { deliverAlertToFollowers } from "@/lib/services/alert-delivery";
import type { Database } from "@/lib/supabase/types";
import type { Alert, AlertPriority, AlertScope, AlertType, AlertVisibility } from "@/lib/types";
import { getCurrentOrganizationScope } from "../organization-scope";
import { safelyCreateNotification } from "./notifications";

type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];

export type CreateAlertInput = {
  title: string;
  message: string;
  alert_type: AlertType;
  alert_scope?: AlertScope;
  alert_priority?: AlertPriority;
  alert_visibility?: AlertVisibility;
  venue_id: string;
  tournament_id?: string | null;
  field_id?: string | null;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

export type UpdateAlertInput = CreateAlertInput;

export const alertTypes: AlertType[] = ["info", "weather", "delay", "emergency", "parking", "concession", "field_closure"];
export const alertScopes: AlertScope[] = ["venue", "field", "tournament", "global"];
export const alertPriorities: AlertPriority[] = ["low", "normal", "high", "urgent"];
export const alertVisibilities: AlertVisibility[] = ["public", "admin_only"];

const alertSelect = "id,organization_id,title,message,alert_type,alert_scope,alert_priority,alert_visibility,venue_id,tournament_id,field_id,start_time,end_time,is_active,created_at,updated_at";

function readAlertType(value: string): AlertType {
  return alertTypes.find((type) => type === value) ?? "info";
}

function readAlertScope(value: string | null | undefined): AlertScope {
  return alertScopes.find((scope) => scope === value) ?? "venue";
}

function readAlertPriority(value: string | null | undefined): AlertPriority {
  return alertPriorities.find((priority) => priority === value) ?? "normal";
}

function readAlertVisibility(value: string | null | undefined): AlertVisibility {
  return alertVisibilities.find((visibility) => visibility === value) ?? "public";
}

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    title: row.title,
    message: row.message,
    alertType: readAlertType(row.alert_type),
    alertScope: readAlertScope(row.alert_scope),
    alertPriority: readAlertPriority(row.alert_priority),
    alertVisibility: readAlertVisibility(row.alert_visibility),
    venueId: row.venue_id,
    tournamentId: row.tournament_id,
    fieldId: row.field_id,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOrganizationIdForVenue(venueId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select("organization_id")
    .eq("id", venueId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load venue organization for alert", error);
  }

  return data?.organization_id ?? null;
}

export function isAlertActive(alert: Alert, now = new Date()) {
  const timestamp = now.getTime();
  return alert.isActive && new Date(alert.startTime).getTime() <= timestamp && new Date(alert.endTime).getTime() >= timestamp;
}

export function isAlertExpired(alert: Alert, now = new Date()) {
  return new Date(alert.endTime).getTime() < now.getTime();
}

export function getAlertPriorityLabel(priority: AlertPriority) {
  return priority.toUpperCase();
}

export function getAlertScopeLabel(scope: AlertScope) {
  const labels: Record<AlertScope, string> = {
    field: "Field-specific",
    global: "Global/all fields",
    tournament: "Tournament-specific",
    venue: "Venue-wide",
  };

  return labels[scope];
}

export function getAlertLabel(alertType: AlertType) {
  return `${alertType.replace("_", " ")} alert`.toUpperCase();
}

export function getAlertTone(alertType: AlertType) {
  if (alertType === "emergency" || alertType === "field_closure") {
    return "border-red-300 bg-red-50 text-red-950";
  }

  if (alertType === "weather" || alertType === "delay" || alertType === "parking") {
    return "border-amber-300 bg-amber-50 text-amber-950";
  }

  return "border-[var(--line)] bg-white text-[var(--foreground)]";
}

export function sortAlertsForDisplay(alerts: Alert[]) {
  const priorityWeight: Record<AlertPriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  return [...alerts].sort((a, b) => {
    const priorityDifference = priorityWeight[a.alertPriority] - priorityWeight[b.alertPriority];
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });
}

export function filterAlertsForFieldPage({
  alerts,
  venueId,
  fieldId,
  publicOnly = true,
  tournamentId,
}: {
  alerts: Alert[];
  venueId: string;
  fieldId: string;
  publicOnly?: boolean;
  tournamentId?: string | null;
}) {
  return sortAlertsForDisplay(alerts.filter((alert) => {
    if (publicOnly && alert.alertVisibility !== "public") {
      return false;
    }

    if (alert.venueId !== venueId) {
      return false;
    }

    if (alert.alertScope === "global" || alert.alertScope === "venue") {
      return true;
    }

    if (alert.alertScope === "field") {
      return alert.fieldId === fieldId;
    }

    if (alert.alertScope === "tournament") {
      return Boolean(alert.tournamentId && alert.tournamentId === tournamentId);
    }

    return false;
  }));
}

export async function getAlerts(): Promise<Alert[]> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase
    .from("alerts")
    .select(alertSelect)
    .order("start_time", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapAlert);
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getCurrentOrganizationScope();
  const now = new Date().toISOString();
  let query = supabase
    .from("alerts")
    .select(alertSelect)
    .eq("is_active", true)
    .lte("start_time", now)
    .gte("end_time", now)
    .order("alert_type", { ascending: true })
    .order("start_time", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapAlert);
}

export async function getAlert(id: string): Promise<Alert | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("alerts")
    .select(alertSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAlert(data) : null;
}

export async function createAlert(data: CreateAlertInput): Promise<Alert> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getOrganizationIdForVenue(data.venue_id);
  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      organization_id: organizationId,
      title: data.title,
      message: data.message,
      alert_type: data.alert_type,
      alert_scope: readAlertScope(data.alert_scope),
      alert_priority: readAlertPriority(data.alert_priority),
      alert_visibility: readAlertVisibility(data.alert_visibility),
      venue_id: data.venue_id,
      tournament_id: readOptionalText(data.tournament_id),
      field_id: readOptionalText(data.field_id),
      start_time: data.start_time,
      end_time: data.end_time,
      is_active: data.is_active ?? true,
    })
    .select(alertSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const mappedAlert = mapAlert(alert);
  await safelyCreateNotification({
    field_id: mappedAlert.fieldId,
    message: mappedAlert.message,
    notification_type: "alert",
    title: mappedAlert.title,
    venue_id: mappedAlert.venueId,
  });

  // Reach followers who left an email; best-effort and never blocks creation.
  if (mappedAlert.isActive && mappedAlert.alertVisibility === "public") {
    void deliverAlertToFollowers(mappedAlert);
  }

  return mappedAlert;
}

export async function updateAlert(id: string, data: UpdateAlertInput): Promise<Alert> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getOrganizationIdForVenue(data.venue_id);
  const { data: alert, error } = await supabase
    .from("alerts")
    .update({
      organization_id: organizationId,
      title: data.title,
      message: data.message,
      alert_type: data.alert_type,
      alert_scope: readAlertScope(data.alert_scope),
      alert_priority: readAlertPriority(data.alert_priority),
      alert_visibility: readAlertVisibility(data.alert_visibility),
      venue_id: data.venue_id,
      tournament_id: readOptionalText(data.tournament_id),
      field_id: readOptionalText(data.field_id),
      start_time: data.start_time,
      end_time: data.end_time,
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(alertSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAlert(alert);
}

export async function updateAlertLifecycle(id: string, data: { alert_visibility?: AlertVisibility; end_time?: string; is_active?: boolean }): Promise<Alert> {
  const supabase = getSupabaseAdminClient();
  const { data: alert, error } = await supabase
    .from("alerts")
    .update({
      ...(data.alert_visibility ? { alert_visibility: readAlertVisibility(data.alert_visibility) } : {}),
      ...(data.end_time ? { end_time: data.end_time } : {}),
      ...(typeof data.is_active === "boolean" ? { is_active: data.is_active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(alertSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAlert(alert);
}

export async function clearActiveOperationsAlerts(venueId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error: typeError } = await supabase
    .from("alerts")
    .update({
      end_time: now,
      is_active: false,
      updated_at: now,
    })
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .in("alert_type", ["weather", "delay", "emergency", "field_closure"]);

  if (typeError) {
    throw new Error(typeError.message);
  }

  const { error: titleError } = await supabase
    .from("alerts")
    .update({
      end_time: now,
      is_active: false,
      updated_at: now,
    })
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .in("title", ["All Clear", "Normal Operations"]);

  if (titleError) {
    throw new Error(titleError.message);
  }
}

export async function hasRecentAllClearAlert(venueId: string, minutes = 10): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);
  const { data, error } = await supabase
    .from("alerts")
    .select("id")
    .eq("venue_id", venueId)
    .eq("title", "All Clear")
    .gte("created_at", since.toISOString())
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}
