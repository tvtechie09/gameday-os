import type { NotificationType } from "@/lib/types";

export const venueNotificationCategories = [
  "game_changes",
  "field_venue_changes",
  "work_updates",
  "announcements",
] as const;

export type VenueNotificationCategory = (typeof venueNotificationCategories)[number];
export type VenueNotificationPriority = "normal" | "urgent";
export type VenueNotificationChannel = "in_app";

export type VenueNotificationPreference = {
  category: VenueNotificationCategory;
  channel: VenueNotificationChannel;
  enabled: boolean;
};

export const venueNotificationCategoryDetails: Record<VenueNotificationCategory, { label: string; description: string }> = {
  game_changes: {
    label: "Game Changes",
    description: "Games starting, finishing, moving, delaying, or cancelling.",
  },
  field_venue_changes: {
    label: "Field & Venue Changes",
    description: "Closures, reopenings, weather impacts, and venue operating changes.",
  },
  work_updates: {
    label: "Work Updates",
    description: "Relevant resource and volunteer activity without every internal transition.",
  },
  announcements: {
    label: "Announcements",
    description: "Operational announcements published for your venue.",
  },
};

// Managers see decision-grade changes by default; routine resource/volunteer
// transitions stay quiet unless the manager opts in.
const managerDefaults = new Set<VenueNotificationCategory>([
  "game_changes",
  "field_venue_changes",
  "announcements",
]);
const staffDefaults = new Set<VenueNotificationCategory>([
  "game_changes",
  "field_venue_changes",
  "work_updates",
  "announcements",
]);

export function defaultVenueNotificationPreferences(roleKey: string): VenueNotificationPreference[] {
  const enabled = roleKey === "venue_staff" || roleKey === "venue_tech_manager" ? staffDefaults : managerDefaults;
  return venueNotificationCategories.map((category) => ({ category, channel: "in_app", enabled: enabled.has(category) }));
}

export function notificationCategoryForType(type: NotificationType): VenueNotificationCategory {
  if (type === "session_status") return "game_changes";
  if (type === "field_status") return "field_venue_changes";
  if (type === "resource" || type === "volunteer") return "work_updates";
  return "announcements";
}

export function shouldShowVenueNotification(input: {
  category: VenueNotificationCategory;
  priority: VenueNotificationPriority;
  preferences: VenueNotificationPreference[];
}): boolean {
  if (input.priority === "urgent") return true;
  return input.preferences.find((preference) => preference.category === input.category && preference.channel === "in_app")?.enabled ?? true;
}

export function isVenueNotificationCategory(value: unknown): value is VenueNotificationCategory {
  return typeof value === "string" && venueNotificationCategories.includes(value as VenueNotificationCategory);
}
