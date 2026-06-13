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
export type ResourceType = "camera" | "audio" | "scoreboard" | "display" | "network" | "streaming" | "other";
export type ResourceStatus = "active" | "inactive" | "maintenance" | "unknown";
export type ResourceActivationType = "parent_camera" | "livestream_link" | "bluetooth_speaker" | "scoreboard_operator" | "announcer" | "other";
export type ResourceActivationStatus = "requested" | "active" | "ended" | "rejected";
export type VolunteerRoleType = "scorekeeper" | "stream_operator" | "audio_operator" | "announcer" | "scoreboard_operator" | "field_admin" | "other";
export type VolunteerRoleStatus = "requested" | "approved" | "active" | "ended" | "rejected";
export type ExternalSourceType = "sportsengine" | "hometeamsonline" | "teamsnap" | "gamechanger" | "csv" | "ical" | "other";
export type ExternalSourceStatus = "draft" | "active" | "paused" | "error";
export type FollowType = "field" | "session";
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
  title: string;
  message: string;
  alertType: AlertType;
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
