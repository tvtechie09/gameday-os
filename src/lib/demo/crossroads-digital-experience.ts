import {
  applyEmergencyContentOverride,
  getPlaylistItems,
  type ContentItem,
  type ContentPlaylist,
  type ContentSchedule,
  type DisplayEndpoint,
  type DisplayZone,
} from "../digital-experience.ts";
import { getCrossroadsTvBoard, type ScoreboardFeedDemoSource } from "../scoreboard-feed.ts";
import { crossroadsVenue } from "./crossroads.ts";

export const crossroadsDisplayEndpoints: DisplayEndpoint[] = [
  endpoint("display-chill-zone-tv-1", "Chill Zone TV 1", "poi", "chill-zone", "tv", "online", "playlist-crossroads-tv", "Hospitality TV for live games, sponsors, and village announcements."),
  endpoint("display-chill-zone-tv-2", "Chill Zone TV 2", "poi", "chill-zone", "tv", "online", "playlist-crossroads-tv", "Secondary hospitality display for rotating tournament content."),
  endpoint("display-bar-tv-1", "Bar TV 1", "bar", "infra-bar-service-area", "tv", "online", "playlist-crossroads-tv", "Readable from bar distance with live scores and weather override."),
  endpoint("display-menu-board-south", "South Menu Board", "concession", "concession-south", "menu_board", "online", "playlist-menu-board", "Menu and concession promotions. POS/menu integrations are future work."),
  endpoint("display-main-concourse-1", "Main Concourse Display", "hallway", "main-concourse", "digital_signage", "online", "playlist-crossroads-tv", "Wayfinding, schedule, and emergency override surface."),
  endpoint("display-restroom-hallway-poster", "Restroom / Hallway Poster QR", "hallway", "infra-concourse-hallway", "kiosk", "unknown", "playlist-wayfinding", "Static poster/QR awareness for wayfinding and family messaging."),
  endpoint("display-outdoor-future-signage", "Future Outdoor Digital Signage", "venue", "crossroads", "future_display", "unknown", "playlist-crossroads-tv", "Future outdoor signage inventory; no player integration is live."),
  endpoint("display-venue-tv-dashboard", "Venue TV Dashboard", "venue", "crossroads", "web_dashboard", "online", "playlist-crossroads-tv", "Browser-based TV dashboard powered by GameDay OS."),
];

export const crossroadsDisplayZones: DisplayZone[] = [
  zone("zone-chill-zone-tvs", "Chill Zone TVs", "Hospitality and leadership-facing displays.", ["display-chill-zone-tv-1", "display-chill-zone-tv-2"], "playlist-crossroads-tv"),
  zone("zone-bar-tvs", "Bar TVs", "Large readable score and announcement rotation for bar/concession viewing.", ["display-bar-tv-1"], "playlist-crossroads-tv"),
  zone("zone-menu-boards", "Menu Boards", "Concession menu and promotion surfaces.", ["display-menu-board-south"], "playlist-menu-board"),
  zone("zone-main-concourse-displays", "Main Concourse Displays", "Wayfinding, schedule, sponsor, and emergency override surfaces.", ["display-main-concourse-1"], "playlist-crossroads-tv"),
  zone("zone-restroom-hallway-posters", "Restroom / Hallway Posters", "Static QR and wayfinding message locations.", ["display-restroom-hallway-poster"], "playlist-wayfinding"),
  zone("zone-future-outdoor-signage", "Future Outdoor Digital Signage", "Future digital signage inventory for entry, parking, and sponsor moments.", ["display-outdoor-future-signage"], "playlist-crossroads-tv"),
  zone("zone-venue-tv-dashboard", "Venue TV Dashboard", "Full-screen browser dashboard for Chill Zone, bar, lobby, or OBS.", ["display-venue-tv-dashboard"], "playlist-crossroads-tv"),
];

export const crossroadsContentItems: ContentItem[] = [
  item("content-live-scores", "Live Scores Board", "live_scores", "Live games from Fields 3A and 6B, finals from Field 8, and delayed field notices.", "high", "active", "public"),
  item("content-upcoming-games", "Upcoming Games", "tournament_schedule", "Next wave: Field 5A at 1:00 PM, Field 6A warmups, Field 7A at 2:30 PM.", "normal", "active", "public"),
  item("content-weather-alert", "Weather Alert", "weather", "Weather watch in effect. Venue staff is monitoring conditions west of the complex.", "high", "active", "public"),
  item("content-village-event", "Village Event Promotion", "village_event", "New Lenox community night placeholder: family activities after championship games.", "normal", "active", "family"),
  item("content-menu-board", "Menu Board", "menu", "Combo special: hot dog, chips, and drink. POS/menu board integration is future work.", "normal", "active", "public", "Future POS/menu system integration"),
  item("content-sponsor-placement", "Sponsor Placement", "sponsor", "Presented by local partners supporting youth sports at Crossroads.", "normal", "active", "public"),
  item("content-restroom-wayfinding", "Restroom / Wayfinding Message", "wayfinding", "Restrooms and concessions are available on the main concourse near Fields 6 and 7.", "normal", "active", "family"),
  item("content-emergency-shelter", "Emergency Shelter Instruction", "emergency", "Shelter instruction placeholder: follow venue staff to marked shelter areas inside the main building.", "emergency", "active", "public", "Future emergency system override requires venue/partner approval"),
  item("content-tournament-welcome", "Tournament Welcome Message", "announcement", "Welcome to the Crossroads Summer Classic. Check field status before warmups.", "normal", "active", "tournament"),
];

export const crossroadsContentPlaylists: ContentPlaylist[] = [
  playlist("playlist-crossroads-tv", "Crossroads TV Rotation", ["content-live-scores", "content-upcoming-games", "content-weather-alert", "content-village-event", "content-sponsor-placement", "content-tournament-welcome"], 12, "General TV rotation for Chill Zone, bar, main concourse, and venue dashboard."),
  playlist("playlist-menu-board", "Concession Menu Rotation", ["content-menu-board", "content-sponsor-placement", "content-weather-alert"], 10, "Concession menu and promotion rotation. POS/menu integrations are not live."),
  playlist("playlist-wayfinding", "Wayfinding Poster Rotation", ["content-restroom-wayfinding", "content-tournament-welcome"], 20, "QR/poster messaging for hallway and restroom zones."),
  playlist("playlist-emergency-override", "Emergency Override", ["content-emergency-shelter"], 5, "Emergency override content. Future display-player integration is not live."),
];

export const crossroadsContentSchedules: ContentSchedule[] = [
  schedule("schedule-tv-day", "playlist-crossroads-tv", "zone-venue-tv-dashboard", "high"),
  schedule("schedule-menu-day", "playlist-menu-board", "zone-menu-boards", "normal"),
  schedule("schedule-wayfinding-day", "playlist-wayfinding", "zone-restroom-hallway-posters", "normal"),
  schedule("schedule-emergency-demo", "playlist-emergency-override", "zone-main-concourse-displays", "emergency"),
];

export const crossroadsDisplayRevenueCards = [
  { id: "sponsor-display-inventory", title: "Sponsor display inventory", description: "Package bar TVs, Chill Zone screens, venue display boards, and public pages as measurable sponsor surfaces.", status: "future opportunity", value: "Digital inventory for local and tournament sponsors" },
  { id: "field-naming", title: "Field naming", description: "Bundle Field 6B, championship moments, and field pages into named sponsor placements.", status: "future opportunity", value: "Premium field and play-surface sponsorship packages" },
  { id: "tv-ad-rotation", title: "TV ad rotation", description: "Rotate approved sponsor, village, and tournament content on venue screens.", status: "future opportunity", value: "Repeat sponsor exposure inside high-traffic spaces" },
  { id: "village-event-promotion", title: "Village event promotion", description: "Use displays and public pages to promote approved Village events.", status: "demo placeholder", value: "Community promotion channel" },
  { id: "concession-promotions", title: "Concession promotions", description: "Promote menu items during peak arrival and between-game windows.", status: "future opportunity", value: "Higher concession throughput and awareness" },
  { id: "tournament-package-promotions", title: "Tournament package promotions", description: "Offer premium sponsor and hospitality packages for tournament weekends.", status: "future opportunity", value: "Tournament revenue expansion" },
  { id: "future-digital-signage-sponsorship", title: "Future digital signage sponsorship", description: "Future player integrations can turn approved screens into managed sponsorship inventory.", status: "future opportunity", value: "Requires signage/player partner approval" },
] as const;

export function getCrossroadsDigitalExperienceContext() {
  return {
    contentItems: crossroadsContentItems,
    displayEndpoints: crossroadsDisplayEndpoints,
    displayZones: crossroadsDisplayZones,
    playlists: crossroadsContentPlaylists,
    schedules: crossroadsContentSchedules,
    venue: crossroadsVenue,
  };
}

export function getCrossroadsTvPlaylist(source: ScoreboardFeedDemoSource = "daktronics") {
  const tvPlaylist = crossroadsContentPlaylists.find((playlistItem) => playlistItem.id === "playlist-crossroads-tv") ?? crossroadsContentPlaylists[0];
  const playlistItems = tvPlaylist ? getPlaylistItems(tvPlaylist, crossroadsContentItems) : [];
  const emergencyItems = crossroadsContentItems.filter((item) => item.priority === "emergency" && item.status === "active");
  const overrideItems = emergencyItems.length > 0 ? applyEmergencyContentOverride(emergencyItems) : applyEmergencyContentOverride(playlistItems);
  const board = getCrossroadsTvBoard(source);

  return {
    board,
    hasEmergencyOverride: overrideItems.some((item) => item.priority === "emergency"),
    items: overrideItems,
    playlist: tvPlaylist,
    sponsorItem: crossroadsContentItems.find((item) => item.type === "sponsor") ?? null,
    villageItem: crossroadsContentItems.find((item) => item.type === "village_event") ?? null,
    weatherItem: crossroadsContentItems.find((item) => item.type === "weather") ?? null,
    menuItem: crossroadsContentItems.find((item) => item.type === "menu") ?? null,
  };
}

function endpoint(
  id: string,
  name: string,
  locationType: DisplayEndpoint["locationType"],
  locationId: string,
  endpointType: DisplayEndpoint["endpointType"],
  status: DisplayEndpoint["status"],
  currentPlaylistId: string,
  notes: string,
): DisplayEndpoint {
  return { currentPlaylistId, endpointType, id, locationId, locationType, name, notes, status, venueId: crossroadsVenue.id };
}

function item(
  id: string,
  title: string,
  type: ContentItem["type"],
  body: string,
  priority: ContentItem["priority"],
  status: ContentItem["status"],
  targetAudience: ContentItem["targetAudience"],
  futureIntegrationLabel: string | null = null,
): ContentItem {
  return { body, futureIntegrationLabel, id, priority, status, targetAudience, title, type, venueId: crossroadsVenue.id };
}

function playlist(id: string, name: string, contentItemIds: string[], rotationSeconds: number, notes: string): ContentPlaylist {
  return { contentItemIds, id, name, notes, rotationSeconds, venueId: crossroadsVenue.id };
}

function schedule(id: string, playlistId: string, displayZoneId: string, priority: ContentSchedule["priority"]): ContentSchedule {
  return { displayZoneId, endsAt: null, id, playlistId, priority, startsAt: null, venueId: crossroadsVenue.id };
}

function zone(id: string, name: string, description: string, endpointIds: string[], defaultPlaylistId: string): DisplayZone {
  return { defaultPlaylistId, description, endpointIds, id, name, venueId: crossroadsVenue.id };
}
