import {
  crossroadsEquipmentEndpoints,
  crossroadsVenue,
} from "./crossroads.ts";
import { crossroadsGmFutureItems } from "./crossroads-gm.ts";
import type { FutureVisionItem, PresentationModel, PresentationScene } from "./presentation.ts";

export const crossroadsPresentationRoute = "/demo/crossroads/presentation";

export const crossroadsPresentationScenes: PresentationScene[] = [
  {
    audience: "future",
    description: "Set the frame: Crossroads becomes the flagship reference implementation for family experience, tournament operations, and venue operations.",
    id: "welcome",
    talkingPoints: [
      "GameDay OS turns the venue itself into the operating layer.",
      "Families, staff, tournament directors, and leadership see the same source of truth.",
      "The demo uses working local UI and clearly labeled placeholders for future integrations.",
    ],
    title: "Welcome to Wintrust Crossroads powered by GameDay OS",
    view: "welcome",
  },
  {
    audience: "family",
    description: "Show the first family touchpoint: arrival, orientation, parking, and confidence.",
    id: "arrival",
    talkingPoints: [
      "Families arrive with a simple venue-level QR entry.",
      "Parking and venue POIs are visible without asking staff.",
      "The experience starts before a parent reaches the field.",
    ],
    title: "Family arrives at Crossroads",
    view: "family_arrival",
  },
  {
    audience: "family",
    description: "Follow the family from South Lot to Field 6B using the same Crossroads model that drives Venue Mode.",
    id: "south-lot-to-6b",
    talkingPoints: [
      "The parent sees: parked in South Lot, game on Field 6B, walking time, and directions.",
      "Field 6B is a play surface under Field 6, not a separate one-off page.",
      "Storm water ponds and restricted landmarks are modeled so future wayfinding can avoid them.",
    ],
    title: "Parent parked in South Lot and navigates to Field 6B",
    view: "family_navigation",
  },
  {
    audience: "family",
    description: "Show what the parent sees during the game: live score, schedule, weather, concessions, restrooms, playground, and field status.",
    id: "family-live-game",
    talkingPoints: [
      "Current/next game comes first.",
      "Venue amenities are nearby and understandable.",
      "Alerts and operations messages can be surfaced without app installs.",
    ],
    title: "Family views live game, schedule, weather, concessions, restrooms, playground",
    view: "family_live",
  },
  {
    audience: "team",
    description: "Show scorekeeper/team mode for Field 6B and the operational link between manual score entry and public displays.",
    id: "scorekeeper-6b",
    talkingPoints: [
      "Scorekeeper access can be scoped to Field 6B only.",
      "The score entry flow updates the family page and scoreboard display.",
      "Temporary game-day access does not grant venue control.",
    ],
    title: "Team and scorekeeper view for Field 6B",
    view: "team_scorekeeper",
  },
  {
    audience: "tournament",
    description: "Give a tournament director a live operating view across fields, delayed games, and readiness.",
    id: "tournament-dashboard",
    talkingPoints: [
      "Tournament leadership sees live fields, delayed fields, and behind-schedule games.",
      "Readiness checklist keeps teams, umpires, scorekeepers, scoreboards, and fields aligned.",
      "Tournament control stays separate from venue infrastructure control.",
    ],
    title: "Tournament Director dashboard",
    view: "tournament_dashboard",
  },
  {
    audience: "venue",
    description: "Show the venue GM and staff the operational dashboard for complex health and communication.",
    id: "venue-operations",
    talkingPoints: [
      "Venue operations sees complex health at a glance.",
      "Equipment endpoints are placeholders today and provider-ready tomorrow.",
      "Announcements, weather, and emergency workflows are venue-owned.",
    ],
    title: "Venue Operations dashboard",
    view: "venue_operations",
  },
  {
    audience: "venue",
    cta: { href: "/demo/crossroads/gm", label: "Open GM Mode" },
    description: "Give the GM and Village leadership a Monday-morning summary of weekend activity, asset health, maintenance, utilization, and revenue opportunities.",
    id: "gm-monday-morning",
    talkingPoints: [
      "Leadership sees a business and operations summary, not field-by-field noise.",
      "Assets and maintenance connect to real venue accountability.",
      "Revenue opportunities are clearly marked as future/potential, not booked revenue.",
    ],
    title: "Monday Morning GM View",
    view: "gm_dashboard",
  },
  {
    audience: "venue",
    cta: { href: "/venue/crossroads/operations", label: "Open Operations Mode" },
    demoStateOverride: {
      alertMessage: "Weather delay issued: Fields 4A, 4C, and 6B paused. Families see the alert immediately.",
      announcementStatus: "pending",
      delayedFieldIds: ["field-4"],
      delayedSurfaceCodes: ["4A", "4C", "6B"],
      equipmentOfflineIds: ["field-4-scoreboard", "field-4-speaker"],
      field6BLive: false,
      gamesBehindSchedule: true,
      weatherAlertIssued: true,
    },
    description: "Simulate a weather delay across selected fields without mutating production data.",
    id: "weather-delay",
    talkingPoints: [
      "Venue issues the operational delay.",
      "Family pages show the alert and status change.",
      "Tournament dashboard reflects delay impact and behind-schedule games.",
      "Operations workflow prepares an announcement.",
    ],
    title: "Simulated Weather Delay",
    view: "weather_delay",
  },
  {
    audience: "venue",
    demoStateOverride: {
      alertMessage: "All clear issued. Games are resuming and affected fields are returning to live or scheduled status.",
      announcementStatus: "sent",
      delayedFieldIds: [],
      delayedSurfaceCodes: [],
      field6BLive: true,
      gamesBehindSchedule: false,
      weatherAlertIssued: false,
    },
    description: "Show recovery: operations sends all clear, games resume, and dashboards return to normal.",
    id: "recovery",
    talkingPoints: [
      "All-clear is a venue-owned workflow.",
      "Families and tournament staff receive a consistent message.",
      "The operating record remains auditable without relying on texts and screenshots.",
    ],
    title: "Recovery: games resume",
    view: "recovery",
  },
  {
    audience: "future",
    description: "Close with the future vision and clearly separate what is demoed today from future vendor and partner work.",
    id: "future-vision",
    talkingPoints: [
      "The foundation is already organized around venue, field, play surface, session, and device scopes.",
      "Vendor integrations require partner approvals and implementation work.",
      "Crossroads becomes the reference venue for future partners.",
    ],
    title: "Future Vision panel",
    view: "future_vision",
  },
];

export const crossroadsFutureVisionItems: FutureVisionItem[] = [
  item("Scoreboard integration", "Connect GameDay OS score state to physical scoreboards or display overlays.", "equipment", "future integration", "One score source for fields, displays, and operations.", "Families and tournaments see consistent live scores.", true),
  item("PA/audio announcement integration", "Route approved operations announcements to PA/audio zones.", "equipment", "future integration", "Faster venue-wide communications.", "Families hear timely delay, field change, and all-clear messages.", true),
  item("Digital signage", "Send field status, schedules, and alerts to lobby, concession, and field displays.", "venue operations", "foundation ready", "Turns venue displays into real-time operations surfaces.", "Families can orient without finding staff."),
  item("Weather automation", "Connect trusted weather/lightning sources to operations workflows.", "safety", "future integration", "Improves consistency for delay and all-clear decisions.", "Families and teams receive faster, clearer updates.", true),
  item("Emergency communication override", "Give approved venue leaders emergency priority over tournament/team communications.", "safety", "foundation ready", "Clear authority during critical incidents.", "Families receive one authoritative instruction path."),
  item("Cisco Meraki presence analytics", "Use network presence trends to understand crowd movement and density.", "integrations", "partner opportunity", "Better staffing, parking, and concession planning.", "Potentially smoother traffic and amenity access.", true),
  item("Cisco Spaces wayfinding", "Future indoor/outdoor wayfinding support for gates, fields, amenities, and safe routes.", "family experience", "partner opportunity", "Reduces staff interruptions and arrival confusion.", "Families can navigate directly to field, concessions, and restrooms.", true),
  item("Security camera awareness, not streaming", "Represent camera health and coverage awareness without exposing live security feeds.", "safety", "roadmap", "Improves situational awareness while preserving safety boundaries.", "Families benefit from better-managed venue operations.", true),
  item("Equipment health monitoring", "Track scoreboard, network, audio, lighting, and camera endpoint status.", "equipment", "foundation ready", "Staff can see what is ready, offline, or not configured.", "Tournaments avoid surprises at game start."),
  item("Field maintenance workflows", "Track field readiness, closures, maintenance notes, and all-clear state.", "venue operations", "foundation ready", "Operations can coordinate field recovery and usage.", "Families see accurate field status."),
  item("AI operations assistant", "Summarize delays, suggest announcements, and flag operational conflicts.", "intelligence", "roadmap", "Helps staff make faster, consistent decisions.", "Tournaments get cleaner updates and fewer manual errors."),
  item("Sponsorship/revenue opportunities", "Connect sponsor assets to public pages, scoreboards, venue displays, and reports.", "revenue", "foundation ready", "Creates measurable sponsor inventory.", "Families see relevant local sponsor support without clutter."),
  item("Tournament app integrations", "Sync schedules and updates with SportsEngine, TeamSnap, GameChanger, HomeTeamsOnline, and others.", "integrations", "future integration", "Reduces duplicate schedule entry.", "Parents and coaches can keep using familiar apps.", true),
  item("Parent/family mobile app", "A dedicated family mode for follows, schedules, venue navigation, and alerts.", "family experience", "roadmap", "Deepens direct relationship with visitors.", "Families get a clearer game day companion."),
  ...crossroadsGmFutureItems,
];

export const crossroadsPresentationModel: PresentationModel = {
  baseState: {
    activeAlert: null,
    announcementStatus: "none",
    delayedSurfaceCodes: [],
    equipmentPlaceholders: crossroadsEquipmentEndpoints.slice(0, 20).map((endpoint) => ({
      id: endpoint.id,
      label: `${endpoint.fieldId.replace("field-", "Field ")} ${endpoint.label}`,
      status: endpoint.status,
    })),
    field4Status: "scheduled",
    field6BStatus: "live",
    gamesBehindSchedule: false,
    scenario: "normal",
    weatherAlertIssued: false,
  },
  futureVision: crossroadsFutureVisionItems,
  heroImageUrl: crossroadsVenue.heroImageUrl,
  route: crossroadsPresentationRoute,
  scenarios: [
    { description: "Standard tournament operations with Field 6B live and normal family flow.", id: "normal", label: "Normal Tournament Day" },
    { description: "Selected fields delayed, alert issued, and operations workflow pending.", id: "weather_delay", label: "Weather Delay" },
    { description: "Championship presentation focus with signage, sponsor, and operations readiness.", id: "championship", label: "Championship Sunday" },
  ],
  scenes: crossroadsPresentationScenes,
  subtitle: "A 10-minute guided tour for venue leadership, tournament directors, investors, and future partners.",
  title: "Crossroads Experience Center",
};

function item(
  title: string,
  description: string,
  category: FutureVisionItem["category"],
  status: FutureVisionItem["status"],
  valueToVenue: string,
  valueToFamiliesTournaments?: string,
  requiresPartnerApproval = false,
): FutureVisionItem {
  return { category, description, requiresPartnerApproval, status, title, valueToFamiliesTournaments, valueToVenue };
}
