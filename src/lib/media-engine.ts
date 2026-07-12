import type { GameState } from "./game-state-engine.ts";

export type MediaLocationType = "venue" | "field" | "playSurface" | "building" | "poi";
export type VideoSourceType = "camera_ptz" | "camera_fixed" | "phone" | "encoder" | "ndi" | "rtsp" | "srt" | "hdmi_capture" | "mock";
export type VideoProvider = "generic" | "axis" | "ptzoptics" | "birddog" | "mevo" | "obs" | "future_provider" | "mock";
export type MediaSourceStatus = "online" | "offline" | "degraded" | "unknown";
export type AudioSourceType = "camera_audio" | "field_mic" | "pa_mix" | "phone" | "mock";
export type OverlayTemplateType =
  | "baseball_scorebug"
  | "simple_scoreboard"
  | "weather_alert"
  | "sponsor_lower_third"
  | "field_identifier"
  | "tournament_branding"
  | "no_overlay";
export type MediaChannelContentType = "live_camera" | "live_score_board" | "rotating_announcements" | "weather_alert" | "sponsor_content" | "menu_board" | "future_stream";
export type DistributionEndpointType =
  | "bar_tv"
  | "chill_zone_tv"
  | "concession_tv"
  | "tournament_hq_display"
  | "family_app"
  | "web_embed"
  | "livestream_destination"
  | "recording_archive"
  | "future_signage_player";
export type MediaEndpointStatus = "online" | "offline" | "degraded" | "unknown" | "future_integration";
export type MediaSessionStatus = "draft" | "preview" | "live" | "paused" | "ended";

export interface VideoSource {
  id: string;
  venueId: string;
  locationType: MediaLocationType;
  locationId: string;
  name: string;
  sourceType: VideoSourceType;
  provider: VideoProvider;
  status: MediaSourceStatus;
  streamUrl?: string | null;
  controlUrl?: string | null;
  supportsPtz: boolean;
  supportsAudio: boolean;
  notes: string;
  isSecurityCamera?: boolean;
}

export interface AudioSource {
  id: string;
  venueId: string;
  locationType: MediaLocationType;
  locationId: string;
  name: string;
  sourceType: AudioSourceType;
  provider: VideoProvider;
  status: MediaSourceStatus;
  streamUrl?: string | null;
  notes: string;
}

export interface OverlayTemplate {
  id: string;
  venueId: string;
  name: string;
  templateType: OverlayTemplateType;
  supportsSponsor: boolean;
  supportsWeather: boolean;
  notes: string;
}

export interface OverlayRenderJob {
  id: string;
  venueId: string;
  templateId: string;
  gameStateId?: string | null;
  status: "queued" | "rendered" | "failed";
  previewText: string;
  createdAt: string;
}

export interface MediaChannel {
  id: string;
  venueId: string;
  name: string;
  description: string;
  contentTypes: MediaChannelContentType[];
  videoSourceId?: string | null;
  overlayTemplateId?: string | null;
  emergencyOverrideEnabled: boolean;
  status: "active" | "paused" | "future";
  notes: string;
}

export interface DistributionEndpoint {
  id: string;
  venueId: string;
  name: string;
  endpointType: DistributionEndpointType;
  locationId: string;
  activeChannelId?: string | null;
  status: MediaEndpointStatus;
  notes: string;
}

export interface MediaRoute {
  id: string;
  venueId: string;
  channelId: string;
  endpointId: string;
  priority: "normal" | "high" | "emergency";
  status: "active" | "paused" | "future";
  notes: string;
}

export interface MediaSession {
  id: string;
  venueId: string;
  channelId: string;
  videoSourceId?: string | null;
  audioSourceId?: string | null;
  overlayTemplateId?: string | null;
  gameStateId?: string | null;
  status: MediaSessionStatus;
  notes: string;
}

export interface OverlayPreview {
  templateId: string;
  title: string;
  lines: string[];
  poweredBy: string;
  emergencyBanner?: string | null;
  sponsorPlacement?: string | null;
}

export const mediaPermissions = [
  "media_view",
  "media_manage",
  "media_route_manage",
  "overlay_manage",
  "camera_control",
  "livestream_manage",
  "emergency_override",
] as const;

export type MediaPermission = typeof mediaPermissions[number];

export function renderOverlayPreview({
  emergencyBanner,
  fieldLabel,
  gameState,
  sponsorPlacement,
  template,
  venueName,
}: {
  emergencyBanner?: string | null;
  fieldLabel: string;
  gameState: GameState;
  sponsorPlacement?: string | null;
  template: OverlayTemplate;
  venueName: string;
}): OverlayPreview {
  if (template.templateType === "no_overlay") {
    return {
      lines: ["Clean feed only"],
      poweredBy: "Powered by GameDay OS",
      templateId: template.id,
      title: template.name,
    };
  }

  const count = typeof gameState.balls === "number" || typeof gameState.strikes === "number" || typeof gameState.outs === "number"
    ? `Count ${gameState.balls ?? 0}-${gameState.strikes ?? 0}, ${gameState.outs ?? 0} out${gameState.outs === 1 ? "" : "s"}`
    : "Count unavailable";

  return {
    emergencyBanner: template.supportsWeather ? emergencyBanner ?? null : null,
    lines: [
      venueName,
      fieldLabel,
      `${gameState.homeTeam} ${gameState.homeScore} - ${gameState.awayScore} ${gameState.awayTeam}`,
      `${gameState.inning} · ${gameState.status.toString().replaceAll("_", " ")}`,
      count,
    ],
    poweredBy: "Powered by GameDay OS",
    sponsorPlacement: template.supportsSponsor ? sponsorPlacement ?? null : null,
    templateId: template.id,
    title: template.name,
  };
}

export function applyEmergencyMediaOverride(channels: MediaChannel[], emergencyChannelId: string | null) {
  if (!emergencyChannelId) return channels;
  const emergencyChannel = channels.find((channel) => channel.id === emergencyChannelId);
  return emergencyChannel ? [emergencyChannel, ...channels.filter((channel) => channel.id !== emergencyChannelId)] : channels;
}

export function getRoutesForChannel(routes: MediaRoute[], channelId: string) {
  return routes.filter((route) => route.channelId === channelId && route.status === "active");
}

export function getEndpointsForChannel(endpoints: DistributionEndpoint[], routes: MediaRoute[], channelId: string) {
  const endpointIds = new Set(getRoutesForChannel(routes, channelId).map((route) => route.endpointId));
  return endpoints.filter((endpoint) => endpointIds.has(endpoint.id));
}

export function canManageMedia(role: string) {
  return ["venue_gm", "venue_admin", "venue_staff", "media_operator", "tournament_director"].includes(role);
}

export function canControlCamera(role: string, source: VideoSource) {
  return source.supportsPtz && !source.isSecurityCamera && ["venue_admin", "venue_staff", "media_operator"].includes(role);
}

export function isProductionCamera(source: VideoSource) {
  return !source.isSecurityCamera;
}
