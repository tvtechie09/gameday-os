export type DisplayLocationType = "venue" | "building" | "poi" | "concession" | "bar" | "field" | "playSurface" | "hallway" | "restroom" | "entrance";
export type DisplayEndpointType = "tv" | "menu_board" | "kiosk" | "digital_signage" | "web_dashboard" | "future_display";
export type DisplayEndpointStatus = "online" | "offline" | "stale" | "unknown";
export type ContentItemType =
  | "live_scores"
  | "menu"
  | "announcement"
  | "sponsor"
  | "village_event"
  | "weather"
  | "emergency"
  | "wayfinding"
  | "tournament_schedule"
  | "promotion"
  | "custom";
export type ContentPriority = "low" | "normal" | "high" | "emergency";
export type ContentStatus = "draft" | "scheduled" | "active" | "expired";
export type ContentTargetAudience = "family" | "team" | "tournament" | "venue" | "staff" | "public";

export interface DisplayEndpoint {
  id: string;
  venueId: string;
  name: string;
  locationType: DisplayLocationType;
  locationId: string;
  endpointType: DisplayEndpointType;
  status: DisplayEndpointStatus;
  currentPlaylistId?: string | null;
  notes: string;
}

export interface ContentItem {
  id: string;
  venueId: string;
  title: string;
  type: ContentItemType;
  body: string;
  imageUrl?: string | null;
  priority: ContentPriority;
  startsAt?: string | null;
  endsAt?: string | null;
  status: ContentStatus;
  targetAudience: ContentTargetAudience;
  futureIntegrationLabel?: string | null;
}

export interface ContentPlaylist {
  id: string;
  venueId: string;
  name: string;
  contentItemIds: string[];
  rotationSeconds: number;
  notes: string;
}

export interface ContentSchedule {
  id: string;
  venueId: string;
  playlistId: string;
  displayZoneId: string;
  startsAt: string | null;
  endsAt: string | null;
  priority: ContentPriority;
}

export interface DisplayZone {
  id: string;
  venueId: string;
  name: string;
  description: string;
  endpointIds: string[];
  defaultPlaylistId: string;
}

export function getPlaylistItems(playlist: ContentPlaylist, items: ContentItem[]) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return playlist.contentItemIds.flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
}

export function getActiveContentItems(items: ContentItem[], now = new Date()) {
  return items.filter((item) => {
    if (item.status !== "active" && item.status !== "scheduled") return false;
    const startsAt = item.startsAt ? new Date(item.startsAt) : null;
    const endsAt = item.endsAt ? new Date(item.endsAt) : null;
    return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
  });
}

export function applyEmergencyContentOverride(items: ContentItem[]) {
  const emergencyItems = items.filter((item) => item.priority === "emergency" && (item.status === "active" || item.status === "scheduled"));
  return emergencyItems.length > 0 ? emergencyItems : items;
}
