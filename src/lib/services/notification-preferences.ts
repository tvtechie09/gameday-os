import "server-only";

import type { AccessContext } from "@/lib/access/capabilities";
import {
  defaultVenueNotificationPreferences,
  isVenueNotificationCategory,
  type VenueNotificationPreference,
} from "@/lib/notification-preferences-core";
import { recordPilotEvent } from "@/lib/services/pilot-telemetry";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function preferenceIdentity(ctx: AccessContext) {
  if (!ctx.authUserId || !ctx.venueId) return null;
  return { authUserId: ctx.authUserId, venueId: ctx.venueId };
}

export async function getVenueNotificationPreferences(ctx: AccessContext): Promise<VenueNotificationPreference[]> {
  const defaults = defaultVenueNotificationPreferences(ctx.roleKey);
  const identity = preferenceIdentity(ctx);
  if (!identity) return defaults;

  const { data, error } = await getSupabaseAdminClient()
    .from("venue_notification_preferences")
    .select("category,channel,enabled")
    .eq("auth_user_id", identity.authUserId)
    .eq("venue_id", identity.venueId);

  if (error) throw new Error(error.message);
  const stored = new Map((data ?? []).map((row) => [`${row.category}:${row.channel}`, row.enabled]));
  return defaults.map((preference) => ({
    ...preference,
    enabled: stored.get(`${preference.category}:${preference.channel}`) ?? preference.enabled,
  }));
}

export async function saveVenueNotificationPreferences(
  ctx: AccessContext,
  submitted: Array<{ category: unknown; enabled: unknown }>,
): Promise<VenueNotificationPreference[]> {
  const identity = preferenceIdentity(ctx);
  if (!identity) throw new Error("Notification preferences require a signed-in venue account.");

  const byCategory = new Map<string, boolean>();
  for (const item of submitted) {
    if (!isVenueNotificationCategory(item.category) || typeof item.enabled !== "boolean") {
      throw new Error("Choose valid notification preferences.");
    }
    byCategory.set(item.category, item.enabled);
  }

  const preferences = defaultVenueNotificationPreferences(ctx.roleKey).map((preference) => ({
    ...preference,
    enabled: byCategory.get(preference.category) ?? preference.enabled,
  }));
  const now = new Date().toISOString();
  const { error } = await getSupabaseAdminClient()
    .from("venue_notification_preferences")
    .upsert(preferences.map((preference) => ({
      auth_user_id: identity.authUserId,
      venue_id: identity.venueId,
      category: preference.category,
      channel: preference.channel,
      enabled: preference.enabled,
      updated_at: now,
    })), { onConflict: "auth_user_id,venue_id,category,channel" });

  if (error) throw new Error(error.message);
  await recordPilotEvent(ctx, "notification_preference_changed", { actionType: "in_app_preferences" });
  return preferences;
}
