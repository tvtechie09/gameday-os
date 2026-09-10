"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/access/session";
import { venueNotificationCategories } from "@/lib/notification-preferences-core";
import { saveVenueNotificationPreferences } from "@/lib/services/notification-preferences";

export type NotificationPreferenceActionResult = { ok?: boolean; error?: string };

export async function saveNotificationPreferencesAction(formData: FormData): Promise<NotificationPreferenceActionResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Sign in again to update your preferences." };

  try {
    await saveVenueNotificationPreferences(ctx, venueNotificationCategories.map((category) => ({
      category,
      enabled: formData.get(category) === "on",
    })));
    revalidatePath("/admin/account");
    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save notification preferences." };
  }
}
