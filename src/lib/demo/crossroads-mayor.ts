import { crossroadsFields, crossroadsGames, crossroadsVenue, getVenueOperationsContext } from "./crossroads.ts";
import { crossroadsDisplayZones } from "./crossroads-digital-experience.ts";
import { crossroadsRevenueOpportunities } from "./crossroads-gm.ts";
import { getCrossroadsSafetyContext } from "./crossroads-safety.ts";

export type VisitorServiceCategory =
  | "restrooms"
  | "water"
  | "first_aid"
  | "lost_found"
  | "lost_child"
  | "accessibility"
  | "parking"
  | "playground"
  | "concessions"
  | "shelter";

export interface VisitorService {
  id: string;
  category: VisitorServiceCategory;
  title: string;
  location: string;
  note: string;
  route?: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  dateLabel: string;
  audience: "families" | "village" | "tournament" | "community";
  note: string;
}

export interface CommunityAnnouncement {
  id: string;
  title: string;
  message: string;
  status: "demo" | "scheduled" | "future";
}

export interface QrContextView {
  id: string;
  role: "parent" | "staff" | "tournament";
  title: string;
  items: string[];
}

export interface DisplayChannel {
  id: string;
  name: string;
  description: string;
  playlistIds: string[];
  status: "demo playlist" | "future integration";
}

export interface FutureVisionPhase {
  id: string;
  label: string;
  title: string;
  items: Array<{
    title: string;
    status: "available in demo" | "platform foundation" | "future integration" | "partner/vendor required";
    note: string;
  }>;
}

export const visitorServices: VisitorService[] = [
  service("service-restrooms", "restrooms", "Restrooms", "North and South concession areas", "Visible from the main concourse and family route."),
  service("service-water", "water", "Water Stations", "Main Concourse", "Hydration location placeholder for high-traffic weekends."),
  service("service-first-aid", "first_aid", "First Aid / AED", "Main building", "AED and first-aid location are modeled for staff routing."),
  service("service-lost-found", "lost_found", "Lost and Found", "Main Gate / Operations desk", "Demo service desk placeholder."),
  service("service-lost-child", "lost_child", "Lost Child Support", "Main building", "Future approved emergency workflow placeholder."),
  service("service-accessibility", "accessibility", "Accessibility", "Main Gate", "Accessible routing placeholder for future wayfinding."),
  service("service-parking", "parking", "Parking", "North, West/Southwest, and South lots", "South Lot is used in the Field 6B family demo.", "/venue/crossroads/parking/south-lot"),
  service("service-playground", "playground", "Playground / Family Area", "Near main concourse", "Family downtime area for between-game windows."),
  service("service-concessions", "concessions", "Concessions", "North and South concession areas", "Menu board and promotion placeholders are shown in the TV demo.", "/venue/crossroads/concession/south"),
  service("service-shelter", "shelter", "Emergency Shelter Guidance", "Main building interior", "Emergency instructions require approved Village and venue workflows."),
];

export const communityEvents: CommunityEvent[] = [
  event("event-summer-classic", "Crossroads Summer Classic", "Today", "tournament", "Pool play across Fields 1-9 with Field 6B featured in the family flow."),
  event("event-village-night", "New Lenox Community Night", "Tonight", "village", "Village event promotion placeholder for venue displays and public pages."),
  event("event-championship-sunday", "Championship Sunday", "This weekend", "community", "Finals, sponsor moments, and community presentation opportunities."),
  event("event-fall-registration", "Fall League Registration Weekend", "Next month", "families", "Future visitor messaging and family app placement opportunity."),
];

export const communityAnnouncements: CommunityAnnouncement[] = [
  { id: "announcement-parking", message: "South Lot remains the best family parking route for Fields 6-9.", status: "demo", title: "Parking guidance" },
  { id: "announcement-village", message: "Explore New Lenox restaurants and community events after games.", status: "future", title: "Explore New Lenox" },
  { id: "announcement-sponsor", message: "Local partners support youth sports and tournament weekends at Crossroads.", status: "scheduled", title: "Community partner highlight" },
];

export const qrContextViews: QrContextView[] = [
  {
    id: "qr-parent",
    items: ["Directions from South Lot", "Live Field 6B game card", "Concessions and restrooms nearby"],
    role: "parent",
    title: "Parent view",
  },
  {
    id: "qr-staff",
    items: ["Field assets and feed health", "Maintenance requests", "Report issue quick action"],
    role: "staff",
    title: "Staff view",
  },
  {
    id: "qr-tournament",
    items: ["Field 6 schedule", "Readiness checklist", "Delayed/behind status"],
    role: "tournament",
    title: "Tournament view",
  },
];

export const displayChannels: DisplayChannel[] = [
  channel("channel-crossroads-live", "Crossroads Live", "Live games, final scores, delayed fields, and upcoming games.", ["playlist-crossroads-tv"], "demo playlist"),
  channel("channel-tournament-hq", "Tournament HQ", "Tournament welcome, readiness, and schedule updates.", ["playlist-crossroads-tv"], "demo playlist"),
  channel("channel-village-events", "Village Events", "Village event ads and Explore New Lenox messaging.", ["playlist-crossroads-tv"], "demo playlist"),
  channel("channel-weather-safety", "Weather & Safety", "Weather watches and emergency banner override modeling.", ["playlist-emergency-override"], "demo playlist"),
  channel("channel-sponsor-rotation", "Sponsor Rotation", "Sponsor placements across public and display surfaces.", ["playlist-crossroads-tv"], "demo playlist"),
  channel("channel-menu-concessions", "Menu/Concessions", "Menu board and food promotion placeholders.", ["playlist-menu-board"], "future integration"),
];

export const futureVisionPhases: FutureVisionPhase[] = [
  phase("phase-1", "Phase 1", "Connected Venue Software", [
    ["Crossroads Today", "available in demo", "Front door for venue status, games, visitors, announcements, and links."],
    ["Venue Command Center", "platform foundation", "Venue-owned communications, delays, maintenance, safety, assets, and staff visibility."],
    ["Family and tournament views", "available in demo", "Parents and tournament directors see role-appropriate context."],
  ]),
  phase("phase-2", "Phase 2", "Read-Only Integrations", [
    ["Daktronics read-only feed", "platform foundation", "Mock read-only scoreboard feed normalizes scores without controlling hardware."],
    ["GameChanger source-of-truth", "future integration", "Future approved schedule/score source when available."],
    ["Read-only camera ingest", "future integration", "RTSP/NDI/SRT field camera ingest can feed approved venue channels."],
  ]),
  phase("phase-3", "Phase 3", "Approved Vendor Integrations", [
    ["Digital signage players", "partner/vendor required", "Display control requires signage partner and venue approval."],
    ["POS/menu systems", "partner/vendor required", "Menu board automation requires POS/menu system approval."],
    ["Access control", "partner/vendor required", "Current demo is role-awareness only, not door control."],
    ["OBS and livestream destinations", "partner/vendor required", "RTMP, YouTube, OBS, recording, and replay require approved integrations."],
  ]),
  phase("phase-4", "Phase 4", "Smart Venue / AI / Wayfinding", [
    ["AI operations assistant", "future integration", "Suggests announcements, identifies conflicts, and summarizes operations."],
    ["Cisco Spaces wayfinding", "partner/vendor required", "Future approved wayfinding and presence analytics."],
    ["Weather automation", "partner/vendor required", "Trusted weather/lightning feeds can support operations workflows."],
    ["Automated highlight clips", "future integration", "Game-state events and approved media can suggest highlights in the future."],
  ]),
  phase("phase-5", "Phase 5", "Connected Municipality", [
    ["Village communication surfaces", "future integration", "Event, tourism, and community messaging across venue channels."],
    ["Municipal asset management", "partner/vendor required", "Future integration with approved municipal asset systems."],
  ]),
];

export const operationsCenterTabs = [
  "Today",
  "Maintenance",
  "Assets",
  "Staff",
  "Safety",
  "Communications",
  "Community",
  "Analytics",
  "Future Roadmap",
] as const;

export function getCrossroadsTodayContext() {
  const operations = getVenueOperationsContext();
  const safety = getCrossroadsSafetyContext();
  const liveFields = crossroadsFields.filter((field) => field.status === "open" || field.status === "live");
  const delayedFields = crossroadsFields.filter((field) => field.status === "delayed");

  return {
    announcements: communityAnnouncements,
    delayedFields,
    eventTitle: "Crossroads Summer Classic",
    gamesToday: crossroadsGames.length,
    liveFields,
    operations,
    safety,
    visitorEstimate: "8,400",
    weather: "Weather watch placeholder: staff monitoring west of the complex.",
    venue: crossroadsVenue,
  };
}

export function getCommunityDashboardContext() {
  return {
    announcements: communityAnnouncements,
    displayZones: crossroadsDisplayZones,
    events: communityEvents,
    partnerHighlights: crossroadsRevenueOpportunities.slice(0, 4),
  };
}

function service(id: string, category: VisitorServiceCategory, title: string, location: string, note: string, route?: string): VisitorService {
  return { category, id, location, note, route, title };
}

function event(id: string, title: string, dateLabel: string, audience: CommunityEvent["audience"], note: string): CommunityEvent {
  return { audience, dateLabel, id, note, title };
}

function channel(id: string, name: string, description: string, playlistIds: string[], status: DisplayChannel["status"]): DisplayChannel {
  return { description, id, name, playlistIds, status };
}

function phase(id: string, label: string, title: string, rows: Array<[string, FutureVisionPhase["items"][number]["status"], string]>): FutureVisionPhase {
  return {
    id,
    items: rows.map(([itemTitle, status, note]) => ({ note, status, title: itemTitle })),
    label,
    title,
  };
}
