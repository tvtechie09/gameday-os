export type VenueStatus = "Draft" | "Live";
export type FieldStatus = "open" | "active" | "delayed" | "closed" | "maintenance";
export type VenueZoneType = "field_area" | "building" | "parking" | "entrance" | "concourse" | "support" | "other";
export type PlaySurfaceType = "field" | "court" | "pitch" | "diamond" | "track" | "turf" | "room" | "other";
export type PlaySurfaceLayoutRole = "standalone" | "parent" | "split_child" | "overlay" | "temporary";
export type FieldLayoutType = "full" | "split" | "overlay" | "temporary";
export type VenueModeEndpointType = "qr_entry" | "equipment" | "location_provider" | "display" | "api" | "other";
export type VenueModeProviderKey = "manual" | "meraki" | "cisco_spaces" | "future_provider" | "other";
export type VenueModeEndpointStatus = "not_configured" | "configured" | "active" | "offline" | "error";
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
export type VenueAssetCategory = "scoreboards" | "displays" | "audio" | "video" | "networking" | "lighting" | "infrastructure" | "miscellaneous";
export type VenueAssetType =
  | "scoreboard"
  | "display"
  | "tv"
  | "speaker"
  | "audio_zone"
  | "camera"
  | "network_equipment"
  | "lighting"
  | "parking_sign"
  | "wifi"
  | "emergency_device"
  | "other";
export type VenueAssetStatus = "healthy" | "offline" | "maintenance_needed" | "unknown";
export type VenueAssetIntegrationStatus = "not_configured" | "configured" | "connected" | "testing";
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
export type IdentityPlatformRoleType =
  | "super_admin"
  | "organization_admin"
  | "venue_director"
  | "venue_staff"
  | "tournament_director"
  | "league_director"
  | "coach"
  | "parent"
  | "player"
  | "scorekeeper"
  | "stream_operator"
  | "read_only";
export type IdentityPersonType = "player" | "parent" | "guardian" | "coach" | "staff" | "fan" | "other";
export type FamilyMemberRelationship = "parent" | "guardian" | "player" | "grandparent" | "relative" | "fan" | "other";
export type TeamMemberRoleType = "coach" | "assistant_coach" | "team_manager" | "player" | "scorekeeper" | "stream_operator" | "other";
export type TeamSessionRelationshipType = "home" | "away" | "participant";
export type IdentityScopeType =
  | "platform"
  | "organization"
  | "venue"
  | "field"
  | "play_surface"
  | "tournament"
  | "league"
  | "team"
  | "player"
  | "family"
  | "game"
  | "session"
  | "device"
  | "integration";
export type SessionEventType =
  | "session_created"
  | "score_update"
  | "resource_activated"
  | "alert_created"
  | "sponsor_clicked"
  | "game_started"
  | "game_final"
  | "operations_update"
  | "scoreboard_update"
  | "streaming_update"
  | "media_added"
  | "sponsor_update"
  | "official_update"
  | "weather_update";

export type SessionOperationsStatus = "normal" | "delayed" | "suspended" | "emergency" | "final_review";

export interface SessionMediaLink {
  label: string;
  url: string;
  type?: "stream" | "photos" | "recap" | "external" | "other";
}

export interface SessionOfficial {
  name: string;
  role: string;
  organization?: string | null;
}

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
  zoneId: string | null;
  parentFieldId: string | null;
  name: string;
  sportType: string;
  surfaceCode: string | null;
  layoutRole: PlaySurfaceLayoutRole;
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
  playSurfaceId: string | null;
  tournamentId: string | null;
  title: string;
  sportType: SessionSportType;
  homeTeam: string;
  awayTeam: string;
  homeOrganizationId?: string | null;
  awayOrganizationId?: string | null;
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
  operationsStatus?: SessionOperationsStatus | null;
  scoreboardProfileId?: string | null;
  streamingProfile?: Record<string, unknown> | null;
  walkupMusicProfile?: Record<string, unknown> | null;
  sponsorPackage?: Record<string, unknown> | null;
  mediaLinks?: SessionMediaLink[];
  officials?: SessionOfficial[];
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

export interface VenueZone {
  id: string;
  organizationId?: string | null;
  venueId: string;
  name: string;
  description: string | null;
  zoneType: VenueZoneType;
  mapLabel: string | null;
  mapX: number | null;
  mapY: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaySurface {
  id: string;
  organizationId?: string | null;
  venueId: string;
  zoneId: string | null;
  parentFieldId: string | null;
  fieldId: string | null;
  name: string;
  surfaceCode: string | null;
  sportTypes: SessionSportType[];
  surfaceType: PlaySurfaceType;
  layoutRole: PlaySurfaceLayoutRole;
  status: FieldStatus;
  mapLabel: string | null;
  mapX: number | null;
  mapY: number | null;
  capacity: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FieldLayout {
  id: string;
  organizationId?: string | null;
  venueId: string;
  parentFieldId: string | null;
  layoutName: string;
  layoutType: FieldLayoutType;
  isActive: boolean;
  notes: string | null;
  playSurfaceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VenueModeEndpoint {
  id: string;
  organizationId?: string | null;
  venueId: string;
  endpointType: VenueModeEndpointType;
  providerKey: VenueModeProviderKey;
  endpointLabel: string;
  endpointUrl: string | null;
  status: VenueModeEndpointStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
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
  // A SponsorCategoryKey, or null when unset. Kept as string so this shared type
  // stays dependency-free; validate with isSponsorCategory from
  // services/sponsor-category-core.
  category?: string | null;
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

export interface VenueBuilding {
  id: string;
  organizationId?: string | null;
  venueId: string;
  name: string;
  description: string | null;
  mapX: number | null;
  mapY: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VenueAsset {
  id: string;
  organizationId?: string | null;
  venueId: string;
  buildingId: string | null;
  fieldId: string | null;
  assetName: string;
  assetType: VenueAssetType;
  assetCategory: VenueAssetCategory;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  physicalLocation: string | null;
  mapX: number | null;
  mapY: number | null;
  status: VenueAssetStatus;
  integrationStatus: VenueAssetIntegrationStatus;
  notes: string | null;
  installationDate: string | null;
  warrantyEnd: string | null;
  photos: string[];
  manuals: string[];
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

export type StormResponseMode = "manual" | "automatic";
export type RainSensitivity = "heavy_only" | "any";

export interface WeatherProfile {
  id: string;
  venueId: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  weatherSource: WeatherSource;
  status: WeatherProfileStatus;
  notes: string | null;
  // Per-venue storm-response automation.
  autoResponseMode: StormResponseMode;
  windThresholdMph: number;
  rainSensitivity: RainSensitivity;
  notifyParents: boolean;
  notifyUmpires: boolean;
  notifyStaff: boolean;
  autoLastTriggeredAt: string | null;
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

export interface IdentityPerson {
  id: string;
  organizationId: string | null;
  userId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  personType: IdentityPersonType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityFamily {
  id: string;
  organizationId: string | null;
  name: string;
  primaryContactPersonId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityFamilyMember {
  id: string;
  organizationId: string | null;
  familyId: string;
  personId: string;
  relationship: FamilyMemberRelationship;
  isPrimaryGuardian: boolean;
  createdAt: string;
}

export interface IdentityTeam {
  id: string;
  organizationId: string | null;
  venueId: string | null;
  leagueId: string | null;
  name: string;
  sportType: SessionSportType;
  ageGroup: string | null;
  seasonName: string | null;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface IdentityTeamMember {
  id: string;
  organizationId: string | null;
  teamId: string;
  personId: string;
  roleType: TeamMemberRoleType;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface IdentityTeamSessionLink {
  id: string;
  organizationId: string | null;
  teamId: string;
  sessionId: string;
  relationshipType: TeamSessionRelationshipType;
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

export interface IdentityRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface IdentityPermission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface IdentityUser {
  id: string;
  authUserId: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  userStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  membershipStatus: string;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  scopeType: IdentityScopeType | string;
  scopeId: string;
  startsAt: string | null;
  endsAt: string | null;
  grantedBy: string | null;
  assignmentStatus: string;
  revokedBy: string | null;
  revokedAt: string | null;
  approvalNotes: string | null;
  createdAt: string;
}

export interface IdentityInvite {
  id: string;
  organizationId: string | null;
  email: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  scopeType: IdentityScopeType | string;
  scopeId: string;
  inviteStatus: string;
  invitedBy: string | null;
  approvedBy: string | null;
  expiresAt: string | null;
  approvedAt: string | null;
  revokedAt: string | null;
  approvalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityAccessRequest {
  id: string;
  userId: string | null;
  email: string | null;
  requestedRoleId: string | null;
  requestedRoleKey: string | null;
  requestedRoleName: string | null;
  requestedBy: string | null;
  scopeType: IdentityScopeType | string;
  scopeId: string;
  requestStatus: string;
  reason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
  approvalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityApproval {
  id: string;
  approvalStatus: string;
  approvalType: string;
  inviteId: string | null;
  accessRequestId: string | null;
  assignmentId: string | null;
  scopeType: IdentityScopeType | string;
  scopeId: string;
  requestedBy: string | null;
  approvedBy: string | null;
  revokedBy: string | null;
  reason: string | null;
  approvalNotes: string | null;
  startsAt: string | null;
  endsAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityAuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  scopeType: IdentityScopeType | string;
  scopeId: string | null;
  metadata: unknown;
  createdAt: string;
}
