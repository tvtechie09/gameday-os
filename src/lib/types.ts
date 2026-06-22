export type VenueStatus = "Draft" | "Live";
export type FieldStatus = "open" | "active" | "delayed" | "closed" | "maintenance";
export type SessionStatus = "scheduled" | "active" | "final";
export type InningHalf = "top" | "bottom";
export type SessionLinkLabel = "GameChanger" | "SidelineHD" | "YouTube" | "SportsEngine" | "TeamSnap" | "Other";
export type SessionSportType = "baseball" | "softball" | "soccer" | "football" | "lacrosse" | "basketball" | "volleyball" | "other";
export type SponsorAssignmentType = "venue" | "field" | "session";
export type SponsorPlacementLabel = "Presented By" | "Field Sponsor" | "Game Sponsor" | "Featured Sponsor";
export type SponsorAnalyticsRange = "today" | "7d" | "30d" | "all";
export type AlertType = "info" | "weather" | "delay" | "emergency" | "parking" | "concession" | "field_closure";
export type AlertScope = "venue" | "field" | "tournament" | "global";
export type AlertPriority = "low" | "normal" | "high" | "urgent";
export type AlertVisibility = "public" | "admin_only";
export type ResourceType = "camera" | "audio" | "scoreboard" | "display" | "network" | "streaming" | "other";
export type ResourceStatus = "active" | "inactive" | "maintenance" | "unknown";
export type AudioMode = "none" | "parent_speaker" | "venue_pa" | "bluetooth_speaker" | "obs_audio" | "future_integration";
export type AudioProfileStatus = "not_configured" | "configured" | "testing" | "active" | "offline";
export type WeatherProfileStatus = "not_configured" | "configured" | "monitoring" | "paused" | "offline";
export type WeatherSource = "manual" | "national_weather_service" | "weatherkit" | "other";
export type ScoreboardConnectionType = "manual" | "network" | "serial" | "controller_bridge" | "cloud_api" | "obs_overlay" | "unknown";
export type ScoreboardIntegrationMode = "manual_only" | "read_only" | "write_to_scoreboard" | "write_to_overlay" | "future_hardware";
export type ScoreboardStatus = "not_configured" | "configured" | "testing" | "active" | "offline";
export type ScoreboardAdapterType = "manual" | "daktronics" | "nevco" | "fairplay" | "musco" | "custom";
export type ScoreboardAdapterStatus = "inactive" | "configured" | "testing" | "active" | "error";
export type ResourceActivationType = "parent_camera" | "livestream_link" | "bluetooth_speaker" | "scoreboard_operator" | "announcer" | "other";
export type ResourceActivationStatus = "requested" | "active" | "ended" | "rejected";
export type VolunteerRoleType = "scorekeeper" | "stream_operator" | "audio_operator" | "announcer" | "scoreboard_operator" | "field_admin" | "other";
export type VolunteerRoleStatus = "requested" | "approved" | "active" | "ended" | "rejected";
export type ExternalSourceType = "sportsengine" | "hometeamsonline" | "teamsnap" | "gamechanger" | "csv" | "ical" | "other";
export type ExternalSourceStatus = "connected" | "not_configured" | "error" | "paused" | "unknown";
export type FollowType = "field" | "session";
export type NotificationType = "alert" | "field_status" | "session_status" | "resource" | "volunteer" | "sponsor";
export type SyncJobStatus = "pending" | "running" | "completed" | "failed";
export type SyncQueueReviewStatus = "pending" | "approved" | "rejected" | "imported";
export type RoleType = "super_admin" | "organization_admin" | "field_operator" | "volunteer" | "read_only";
export type SessionEventType =
  | "session_created"
  | "score_update"
  | "resource_activated"
  | "alert_created"
  | "sponsor_clicked"
  | "game_started"
  | "game_final";

export interface Venue {
  id: string;
  organizationId?: string | null;
  name: string;
  description: string;
  address: string;
  city?: string;
  state?: string;
  parkingNote: string;
  fieldCount: number;
  status: VenueStatus;
  logoUrl: string | null;
  bannerUrl: string | null;
  mapImageUrl: string | null;
  mapNotes: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  updatedAt: string;
}

export interface Field {
  id: string;
  organizationId?: string | null;
  venueId: string;
  name: string;
  sportType: string;
  mapLabel: string | null;
  mapX: number | null;
  mapY: number | null;
  surface?: string;
  status: FieldStatus;
  qrPath: string;
  resources: string[];
  updatedAt: string;
}

export interface Session {
  id: string;
  organizationId?: string | null;
  fieldId: string;
  tournamentId: string | null;
  title: string;
  sportType: SessionSportType;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  endTime: string | null;
  status: SessionStatus;
  homeScore: number;
  awayScore: number;
  isDemo: boolean;
  inning: number;
  inningHalf: InningHalf;
  balls: number;
  strikes: number;
  outs: number;
  gameStatus: SessionStatus;
  primaryLinkLabel: SessionLinkLabel | null;
  primaryLinkUrl: string | null;
  secondaryLinkLabel: SessionLinkLabel | null;
  secondaryLinkUrl: string | null;
  externalSource: string | null;
  externalSourceId: string | null;
  externalSourceUrl: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  organizationId?: string | null;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sponsor {
  id: string;
  organizationId?: string | null;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorAssignment {
  id: string;
  sponsorId: string;
  assignmentType: SponsorAssignmentType;
  venueId: string | null;
  fieldId: string | null;
  sessionId: string | null;
  placementLabel: SponsorPlacementLabel;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorPlacement extends SponsorAssignment {
  sponsor: Sponsor;
}

export interface SponsorAnalyticsSummary {
  sponsorId: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface Alert {
  id: string;
  organizationId?: string | null;
  title: string;
  message: string;
  alertType: AlertType;
  alertScope: AlertScope;
  alertPriority: AlertPriority;
  alertVisibility: AlertVisibility;
  venueId: string;
  tournamentId: string | null;
  fieldId: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  organizationId?: string | null;
  venueId: string;
  fieldId: string | null;
  resourceName: string;
  resourceType: ResourceType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  status: ResourceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AudioProfile {
  id: string;
  organizationId?: string | null;
  venueId: string;
  fieldId: string;
  sessionId: string | null;
  audioMode: AudioMode;
  speakerType: string | null;
  provider: string | null;
  status: AudioProfileStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherProfile {
  id: string;
  venueId: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  weatherSource: WeatherSource;
  status: WeatherProfileStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreboardProfile {
  id: string;
  organizationId?: string | null;
  venueId: string;
  fieldId: string;
  resourceId: string | null;
  manufacturer: string;
  model: string;
  connectionType: ScoreboardConnectionType;
  integrationMode: ScoreboardIntegrationMode;
  scoreboardStatus: ScoreboardStatus;
  ipAddress: string | null;
  controllerLocation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreboardAdapter {
  id: string;
  scoreboardId: string;
  adapterType: ScoreboardAdapterType;
  adapterStatus: ScoreboardAdapterStatus;
  lastSyncAt: string | null;
  notes: string | null;
}

export interface ResourceActivation {
  id: string;
  resourceId: string | null;
  venueId: string;
  fieldId: string;
  sessionId: string | null;
  activationType: ResourceActivationType;
  displayName: string;
  contactName: string | null;
  contactEmail: string | null;
  resourceUrl: string | null;
  status: ResourceActivationStatus;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  assignedToSession: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerRole {
  id: string;
  venueId: string;
  fieldId: string;
  sessionId: string | null;
  roleType: VolunteerRoleType;
  displayName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: VolunteerRoleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalSource {
  id: string;
  organizationId?: string | null;
  venueId: string;
  sourceType: ExternalSourceType;
  sourceName: string;
  sourceUrl: string | null;
  sourceStatus: ExternalSourceStatus;
  lastSyncAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  venueId: string | null;
  fieldId: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface SyncJob {
  id: string;
  sourceId: string | null;
  sourceType: string;
  status: SyncJobStatus;
  recordsFound: number;
  recordsImported: number;
  recordsSkipped: number;
  createdAt: string;
  completedAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  websiteUrl: string | null;
  description: string;
  createdAt: string;
}

export interface RoleAssignment {
  id: string;
  organizationId: string | null;
  roleType: RoleType;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  syncJobId: string;
  sourceRecordId: string;
  sourceData: unknown;
  reviewStatus: SyncQueueReviewStatus;
  createdAt: string;
}

export interface FollowSummary {
  id: string;
  fieldId: string;
  sessionId: string | null;
  followType: FollowType;
  displayName: string | null;
  createdAt: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  eventType: SessionEventType;
  eventMessage: string;
  createdAt: string;
}

export interface FieldFollowSummary {
  fieldId: string;
  follows: number;
}

export interface FieldPageViewSummary {
  fieldId: string;
  views: number;
}
