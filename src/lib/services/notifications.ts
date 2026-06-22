import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Notification, NotificationType } from "@/lib/types";
import { getOrganizationDataScope } from "./organization-data-scope";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export type CreateNotificationInput = {
  notification_type: NotificationType;
  title: string;
  message: string;
  venue_id?: string | null;
  field_id?: string | null;
  session_id?: string | null;
};

export const notificationTypes: NotificationType[] = ["alert", "field_status", "session_status", "resource", "volunteer", "sponsor"];

const notificationSelect = "id,notification_type,title,message,venue_id,field_id,session_id,created_at";

function readNotificationType(value: string): NotificationType {
  return notificationTypes.find((type) => type === value) ?? "alert";
}

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    notificationType: readNotificationType(row.notification_type),
    title: row.title,
    message: row.message,
    venueId: readOptionalText(row.venue_id),
    fieldId: readOptionalText(row.field_id),
    sessionId: readOptionalText(row.session_id),
    createdAt: row.created_at,
  };
}

function isNotificationInScope(notification: Notification, scope: Awaited<ReturnType<typeof getOrganizationDataScope>>) {
  if (!scope) return true;
  return Boolean(
    (notification.fieldId && scope.fieldIds.has(notification.fieldId))
    || (notification.venueId && scope.venueIds.has(notification.venueId))
    || (notification.sessionId && scope.sessionIds.has(notification.sessionId)),
  );
}

export function getNotificationTypeLabel(type: NotificationType) {
  const labels: Record<NotificationType, string> = {
    alert: "Alert",
    field_status: "Field Status",
    session_status: "Session Status",
    resource: "Resource",
    volunteer: "Volunteer",
    sponsor: "Sponsor",
  };

  return labels[type];
}

export function getNotificationTypeClass(type: NotificationType) {
  const classes: Record<NotificationType, string> = {
    alert: "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
    field_status: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
    session_status: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    resource: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200",
    volunteer: "bg-purple-50 text-purple-800 ring-1 ring-purple-200",
    sponsor: "bg-pink-50 text-pink-800 ring-1 ring-pink-200",
  };

  return classes[type];
}

export async function getNotifications(type?: NotificationType | "all"): Promise<Notification[]> {
  const supabase = getSupabaseServerClient();
  const scope = await getOrganizationDataScope();
  let query = supabase
    .from("notifications")
    .select(notificationSelect)
    .order("created_at", { ascending: false });

  if (type && type !== "all") {
    query = query.eq("notification_type", type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapNotification).filter((notification) => isNotificationInScope(notification, scope));
}

export async function createNotification(data: CreateNotificationInput): Promise<Notification> {
  const supabase = getSupabaseAdminClient();
  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      notification_type: data.notification_type,
      title: data.title,
      message: data.message,
      venue_id: readOptionalText(data.venue_id),
      field_id: readOptionalText(data.field_id),
      session_id: readOptionalText(data.session_id),
    })
    .select(notificationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapNotification(notification);
}

export async function safelyCreateNotification(data: CreateNotificationInput): Promise<void> {
  try {
    await createNotification(data);
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}
