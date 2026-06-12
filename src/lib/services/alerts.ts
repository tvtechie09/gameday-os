import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Alert, AlertType } from "@/lib/types";

type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];

export type CreateAlertInput = {
  title: string;
  message: string;
  alert_type: AlertType;
  venue_id: string;
  tournament_id?: string | null;
  field_id?: string | null;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

export type UpdateAlertInput = CreateAlertInput;

export const alertTypes: AlertType[] = ["info", "weather", "delay", "emergency", "parking", "concession", "field_closure"];

const alertSelect = "id,title,message,alert_type,venue_id,tournament_id,field_id,start_time,end_time,is_active,created_at,updated_at";

function readAlertType(value: string): AlertType {
  return alertTypes.find((type) => type === value) ?? "info";
}

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    alertType: readAlertType(row.alert_type),
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

export function isAlertActive(alert: Alert, now = new Date()) {
  const timestamp = now.getTime();
  return alert.isActive && new Date(alert.startTime).getTime() <= timestamp && new Date(alert.endTime).getTime() >= timestamp;
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

export function filterAlertsForFieldPage({
  alerts,
  venueId,
  fieldId,
  tournamentId,
}: {
  alerts: Alert[];
  venueId: string;
  fieldId: string;
  tournamentId?: string | null;
}) {
  return alerts.filter((alert) => {
    if (alert.venueId !== venueId) {
      return false;
    }

    if (alert.fieldId && alert.fieldId !== fieldId) {
      return false;
    }

    if (alert.tournamentId && alert.tournamentId !== tournamentId) {
      return false;
    }

    return true;
  });
}

export async function getAlerts(): Promise<Alert[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("alerts")
    .select(alertSelect)
    .order("start_time", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapAlert);
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("alerts")
    .select(alertSelect)
    .eq("is_active", true)
    .lte("start_time", now)
    .gte("end_time", now)
    .order("alert_type", { ascending: true })
    .order("start_time", { ascending: false });

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
  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      title: data.title,
      message: data.message,
      alert_type: data.alert_type,
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

  return mapAlert(alert);
}

export async function updateAlert(id: string, data: UpdateAlertInput): Promise<Alert> {
  const supabase = getSupabaseAdminClient();
  const { data: alert, error } = await supabase
    .from("alerts")
    .update({
      title: data.title,
      message: data.message,
      alert_type: data.alert_type,
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
