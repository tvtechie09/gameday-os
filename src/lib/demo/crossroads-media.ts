import { appendGameStateHistoryEvent, type GameState } from "../game-state-engine.ts";
import {
  applyEmergencyMediaOverride,
  canManageMedia,
  getEndpointsForChannel,
  mediaPermissions,
  renderOverlayPreview,
  type AudioSource,
  type DistributionEndpoint,
  type MediaChannel,
  type MediaRoute,
  type MediaSession,
  type OverlayRenderJob,
  type OverlayTemplate,
  type VideoSource,
} from "../media-engine.ts";
import { getCrossroadsNormalizedGameStates } from "../scoreboard-feed.ts";
import { crossroadsVenue } from "./crossroads.ts";

export const crossroadsVideoSources: VideoSource[] = [
  videoSource("video-championship-field", "Championship Field camera mock", "field", "field-6", "camera_fixed", "mock", "online", false, true, "Mock production camera for championship field presentation. No real camera hardware is connected."),
  videoSource("video-field-6b", "Field 6B camera mock", "playSurface", "surface-6b", "camera_fixed", "mock", "online", false, true, "Mock Field 6B production camera feed for overlay and routing demos."),
  videoSource("video-security-concourse", "Main Concourse security camera awareness", "poi", "main-concourse", "camera_fixed", "axis", "unknown", false, false, "Security camera awareness only. This is not a streamable production camera feed.", true),
  videoSource("video-future-ptz", "Future PTZ camera placeholder", "field", "field-4", "camera_ptz", "future_provider", "unknown", true, true, "Future PTZ integration. Camera control is permission-restricted and not live."),
];

export const crossroadsAudioSources: AudioSource[] = [
  {
    id: "audio-field-6b-camera",
    locationId: "surface-6b",
    locationType: "playSurface",
    name: "Field 6B camera audio mock",
    notes: "Mock audio source. No live microphone or PA integration is connected.",
    provider: "mock",
    sourceType: "camera_audio",
    status: "online",
    streamUrl: null,
    venueId: crossroadsVenue.id,
  },
];

export const crossroadsOverlayTemplates: OverlayTemplate[] = [
  overlay("overlay-baseball-scorebug", "Baseball Scorebug", "baseball_scorebug", true, true, "Primary baseball overlay using score, inning, count, status, sponsor, weather, and powered-by text."),
  overlay("overlay-simple-scoreboard", "Simple Scoreboard", "simple_scoreboard", true, false, "Large score layout for TVs and family app preview."),
  overlay("overlay-weather-alert", "Weather Alert Banner", "weather_alert", false, true, "Weather and emergency banner overlay placeholder."),
  overlay("overlay-sponsor-lower-third", "Sponsor Lower Third", "sponsor_lower_third", true, false, "Sponsor placement overlay placeholder."),
  overlay("overlay-field-identifier", "Field Identifier", "field_identifier", false, false, "Venue, field, and play-surface identifier."),
  overlay("overlay-tournament-branding", "Tournament Branding", "tournament_branding", true, false, "Tournament and sponsor branding overlay placeholder."),
  overlay("overlay-none", "No Overlay", "no_overlay", false, false, "Clean feed without graphics."),
];

export const crossroadsMediaChannels: MediaChannel[] = [
  channel("media-channel-crossroads-live", "Crossroads Live", "Live games, score overlays, finals, and venue updates.", ["live_camera", "live_score_board", "rotating_announcements"], "video-field-6b", "overlay-baseball-scorebug", true, "active"),
  channel("media-channel-championship-field", "Championship Field", "Championship presentation feed with sponsor and tournament branding.", ["live_camera", "sponsor_content"], "video-championship-field", "overlay-tournament-branding", true, "active"),
  channel("media-channel-field-6b-live", "Field 6B Live", "Field 6B live camera mock with scorebug overlay.", ["live_camera", "live_score_board"], "video-field-6b", "overlay-baseball-scorebug", true, "active"),
  channel("media-channel-tournament-hq", "Tournament HQ", "Tournament operations display with schedule, readiness, and score state.", ["live_score_board", "rotating_announcements"], null, "overlay-simple-scoreboard", true, "active"),
  channel("media-channel-weather-safety", "Weather & Safety", "Emergency/weather override channel for venue displays.", ["weather_alert", "rotating_announcements"], null, "overlay-weather-alert", true, "active"),
  channel("media-channel-village-events", "Village Events", "Village and visitor messaging placeholder channel.", ["rotating_announcements"], null, "overlay-field-identifier", false, "active"),
  channel("media-channel-sponsor-rotation", "Sponsor Rotation", "Sponsor graphics and lower-third inventory.", ["sponsor_content"], null, "overlay-sponsor-lower-third", false, "active"),
  channel("media-channel-concessions-menu", "Concessions/Menu", "Menu board and food promotion placeholder channel.", ["menu_board"], null, "overlay-none", false, "future"),
];

export const crossroadsDistributionEndpoints: DistributionEndpoint[] = [
  endpoint("endpoint-chill-zone-tv", "Chill Zone TV endpoint", "chill_zone_tv", "chill-zone", "media-channel-crossroads-live", "online", "Mock endpoint for hospitality screens."),
  endpoint("endpoint-bar-tv", "Bar TV endpoint", "bar_tv", "infra-bar-service-area", "media-channel-field-6b-live", "online", "Mock endpoint for bar-distance live game display."),
  endpoint("endpoint-tournament-hq", "Tournament HQ display", "tournament_hq_display", "main-building", "media-channel-tournament-hq", "online", "Mock tournament operations display."),
  endpoint("endpoint-family-app", "Family app endpoint", "family_app", "surface-6b", "media-channel-field-6b-live", "online", "Family app/media preview endpoint. No public app push is sent."),
  endpoint("endpoint-web-embed", "Public web embed", "web_embed", "surface-6b", "media-channel-crossroads-live", "online", "Future public embed placeholder."),
  endpoint("endpoint-livestream-destination", "Future livestream destination", "livestream_destination", "crossroads", null, "future_integration", "RTMP/YouTube/livestream destinations are future integrations."),
  endpoint("endpoint-recording-archive", "Future recording archive", "recording_archive", "crossroads", null, "future_integration", "Recording and replay are future integrations."),
  endpoint("endpoint-future-signage-player", "Future signage player", "future_signage_player", "main-concourse", "media-channel-weather-safety", "future_integration", "Digital signage player integration requires partner approval."),
];

export const crossroadsMediaRoutes: MediaRoute[] = [
  route("route-live-chill-zone", "media-channel-crossroads-live", "endpoint-chill-zone-tv", "active", "normal", "Crossroads Live to Chill Zone TVs."),
  route("route-6b-bar", "media-channel-field-6b-live", "endpoint-bar-tv", "active", "high", "Field 6B Live to Bar TV."),
  route("route-hq-display", "media-channel-tournament-hq", "endpoint-tournament-hq", "active", "high", "Tournament HQ channel to HQ display."),
  route("route-family-app", "media-channel-field-6b-live", "endpoint-family-app", "active", "normal", "Field 6B Live preview to family app endpoint."),
  route("route-emergency-signage", "media-channel-weather-safety", "endpoint-future-signage-player", "active", "emergency", "Emergency override route to future signage player placeholder."),
  route("route-future-livestream", "media-channel-field-6b-live", "endpoint-livestream-destination", "future", "normal", "Future livestream destination route."),
];

export const crossroadsMediaSessions: MediaSession[] = [
  {
    audioSourceId: "audio-field-6b-camera",
    channelId: "media-channel-field-6b-live",
    gameStateId: "g-6b",
    id: "media-session-field-6b",
    notes: "Mock media session. No live RTMP, camera hardware, or streaming platform is connected.",
    overlayTemplateId: "overlay-baseball-scorebug",
    status: "preview",
    venueId: crossroadsVenue.id,
    videoSourceId: "video-field-6b",
  },
];

export const crossroadsMediaPermissions = [
  { role: "venue_gm", permissions: ["media_view", "media_manage", "media_route_manage", "overlay_manage", "emergency_override"] },
  { role: "venue_staff", permissions: ["media_view", "media_route_manage"] },
  { role: "media_operator", permissions: ["media_view", "media_manage", "overlay_manage", "camera_control", "livestream_manage"] },
  { role: "tournament_director", permissions: ["media_view"] },
  { role: "parent", permissions: [] },
] as const;

export function getCrossroadsField6BMediaGameState(): GameState {
  const sourceState = getCrossroadsNormalizedGameStates("daktronics").find((state) => state.playSurfaceId === "surface-6b") ?? getCrossroadsNormalizedGameStates("daktronics")[0];

  return appendGameStateHistoryEvent({
    ...sourceState,
    awayScore: 4,
    awayTeam: "Bulldogs",
    balls: 2,
    homeScore: 6,
    homeTeam: "Illinois Celtics",
    inning: "Top 4th",
    isOfficial: true,
    outs: 1,
    status: "live",
    strikes: 1,
  }, "Media Engine preview consumed normalized Field 6B game state.");
}

export function getCrossroadsOverlayPreview(templateId = "overlay-baseball-scorebug") {
  const template = crossroadsOverlayTemplates.find((item) => item.id === templateId) ?? crossroadsOverlayTemplates[0];
  return renderOverlayPreview({
    emergencyBanner: "Weather watch placeholder. Venue staff monitoring conditions.",
    fieldLabel: "Field 6B",
    gameState: getCrossroadsField6BMediaGameState(),
    sponsorPlacement: "Presented by local Crossroads partners",
    template,
    venueName: crossroadsVenue.name,
  });
}

export function getCrossroadsOverlayRenderJobs(): OverlayRenderJob[] {
  const preview = getCrossroadsOverlayPreview();
  return [
    {
      createdAt: "2026-07-02T12:00:00.000Z",
      gameStateId: "g-6b",
      id: "overlay-job-field-6b-preview",
      previewText: preview.lines.join(" | "),
      status: "rendered",
      templateId: preview.templateId,
      venueId: crossroadsVenue.id,
    },
  ];
}

export function getCrossroadsMediaEngineContext() {
  const emergencyChannelId = "media-channel-weather-safety";

  return {
    activeChannels: applyEmergencyMediaOverride(crossroadsMediaChannels, emergencyChannelId),
    audioSources: crossroadsAudioSources,
    channels: crossroadsMediaChannels,
    distributionEndpoints: crossroadsDistributionEndpoints,
    emergencyChannelId,
    field6BGameState: getCrossroadsField6BMediaGameState(),
    overlayPreview: getCrossroadsOverlayPreview(),
    overlayRenderJobs: getCrossroadsOverlayRenderJobs(),
    overlayTemplates: crossroadsOverlayTemplates,
    permissions: mediaPermissions,
    rolePermissions: crossroadsMediaPermissions,
    routes: crossroadsMediaRoutes,
    sessions: crossroadsMediaSessions,
    videoSources: crossroadsVideoSources,
  };
}

export function getCrossroadsMediaChannel(channelId: string) {
  const context = getCrossroadsMediaEngineContext();
  const channel = context.channels.find((item) => item.id === channelId) ?? null;
  const endpoints = channel ? getEndpointsForChannel(context.distributionEndpoints, context.routes, channel.id) : [];
  const source = channel?.videoSourceId ? context.videoSources.find((item) => item.id === channel.videoSourceId) ?? null : null;
  const template = channel?.overlayTemplateId ? context.overlayTemplates.find((item) => item.id === channel.overlayTemplateId) ?? null : null;
  const overlayPreview = template ? getCrossroadsOverlayPreview(template.id) : null;

  return { channel, endpoints, overlayPreview, source, template };
}

export function canRoleManageCrossroadsMedia(role: string) {
  if (role === "parent" || role === "family_viewer") return false;
  return canManageMedia(role);
}

function videoSource(
  id: string,
  name: string,
  locationType: VideoSource["locationType"],
  locationId: string,
  sourceType: VideoSource["sourceType"],
  provider: VideoSource["provider"],
  status: VideoSource["status"],
  supportsPtz: boolean,
  supportsAudio: boolean,
  notes: string,
  isSecurityCamera = false,
): VideoSource {
  return {
    controlUrl: null,
    id,
    isSecurityCamera,
    locationId,
    locationType,
    name,
    notes,
    provider,
    sourceType,
    status,
    streamUrl: provider === "mock" ? `mock://crossroads/${id}` : null,
    supportsAudio,
    supportsPtz,
    venueId: crossroadsVenue.id,
  };
}

function overlay(id: string, name: string, templateType: OverlayTemplate["templateType"], supportsSponsor: boolean, supportsWeather: boolean, notes: string): OverlayTemplate {
  return { id, name, notes, supportsSponsor, supportsWeather, templateType, venueId: crossroadsVenue.id };
}

function channel(
  id: string,
  name: string,
  description: string,
  contentTypes: MediaChannel["contentTypes"],
  videoSourceId: string | null,
  overlayTemplateId: string | null,
  emergencyOverrideEnabled: boolean,
  status: MediaChannel["status"],
): MediaChannel {
  return { contentTypes, description, emergencyOverrideEnabled, id, name, notes: "Demo media channel. No live camera, signage, or streaming integration is connected.", overlayTemplateId, status, venueId: crossroadsVenue.id, videoSourceId };
}

function endpoint(
  id: string,
  name: string,
  endpointType: DistributionEndpoint["endpointType"],
  locationId: string,
  activeChannelId: string | null,
  status: DistributionEndpoint["status"],
  notes: string,
): DistributionEndpoint {
  return { activeChannelId, endpointType, id, locationId, name, notes, status, venueId: crossroadsVenue.id };
}

function route(
  id: string,
  channelId: string,
  endpointId: string,
  status: MediaRoute["status"],
  priority: MediaRoute["priority"],
  notes: string,
): MediaRoute {
  return { channelId, endpointId, id, notes, priority, status, venueId: crossroadsVenue.id };
}
