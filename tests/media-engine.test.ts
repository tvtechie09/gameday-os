import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { applyEmergencyMediaOverride, canControlCamera, getEndpointsForChannel, isProductionCamera, mediaPermissions } from "../src/lib/media-engine.ts";
import {
  canRoleManageCrossroadsMedia,
  crossroadsDistributionEndpoints,
  crossroadsMediaChannels,
  crossroadsMediaRoutes,
  crossroadsVideoSources,
  getCrossroadsField6BMediaGameState,
  getCrossroadsMediaChannel,
  getCrossroadsMediaEngineContext,
  getCrossroadsOverlayPreview,
} from "../src/lib/demo/crossroads-media.ts";
import { crossroadsPresentationScenes } from "../src/lib/demo/crossroads-presentation.ts";

describe("GameDay Media Engine foundation", () => {
  it("loads Media Engine models and routes", () => {
    assert(mediaPermissions.includes("media_view"));
    assert(mediaPermissions.includes("media_route_manage"));
    assert(mediaPermissions.includes("camera_control"));
    assert.equal(existsSync("src/app/demo/crossroads/media/page.tsx"), true);
    assert.equal(existsSync("src/app/demo/crossroads/media/channel/[channelId]/page.tsx"), true);
    assert.equal(existsSync("src/app/demo/crossroads/media/endpoints/page.tsx"), true);
    assert.equal(existsSync("src/app/demo/crossroads/media/overlay-preview/page.tsx"), true);
  });

  it("seeds Crossroads media sources, channels, endpoints, and sessions", () => {
    const context = getCrossroadsMediaEngineContext();

    assert(context.videoSources.some((source) => source.name === "Championship Field camera mock"));
    assert(context.videoSources.some((source) => source.name === "Field 6B camera mock"));
    assert(context.channels.some((channel) => channel.name === "Crossroads Live"));
    assert(context.channels.some((channel) => channel.name === "Field 6B Live"));
    assert(context.distributionEndpoints.some((endpoint) => endpoint.endpointType === "bar_tv"));
    assert(context.distributionEndpoints.some((endpoint) => endpoint.endpointType === "family_app"));
    assert(context.sessions.some((session) => session.id === "media-session-field-6b"));
  });

  it("overlay preview consumes Game State Engine data", () => {
    const state = getCrossroadsField6BMediaGameState();
    const preview = getCrossroadsOverlayPreview();

    assert.equal(state.homeTeam, "Illinois Celtics");
    assert.equal(state.awayTeam, "Bulldogs");
    assert.equal(state.inning, "Top 4th");
    assert.equal(state.balls, 2);
    assert(preview.lines.some((line) => line.includes("Illinois Celtics")));
    assert(preview.lines.some((line) => line.includes("Count 2-1")));
    assert.equal(preview.poweredBy, "Powered by GameDay OS");
  });

  it("channels route to endpoints and TV dashboard can render a media channel", () => {
    const endpoints = getEndpointsForChannel(crossroadsDistributionEndpoints, crossroadsMediaRoutes, "media-channel-field-6b-live");
    const channel = getCrossroadsMediaChannel("media-channel-field-6b-live");

    assert(endpoints.some((endpoint) => endpoint.id === "endpoint-bar-tv"));
    assert(endpoints.some((endpoint) => endpoint.id === "endpoint-family-app"));
    assert.equal(channel.channel?.name, "Field 6B Live");
    assert.equal(channel.source?.name, "Field 6B camera mock");
    assert(channel.overlayPreview?.lines.some((line) => line.includes("Bulldogs")));
  });

  it("emergency override supersedes normal channel content", () => {
    const ordered = applyEmergencyMediaOverride(crossroadsMediaChannels, "media-channel-weather-safety");

    assert.equal(ordered[0]?.id, "media-channel-weather-safety");
    assert.equal(ordered[0]?.name, "Weather & Safety");
  });

  it("family users cannot manage media routes and camera control is restricted", () => {
    const ptz = crossroadsVideoSources.find((source) => source.id === "video-future-ptz");
    const field6B = crossroadsVideoSources.find((source) => source.id === "video-field-6b");

    assert.equal(canRoleManageCrossroadsMedia("parent"), false);
    assert.equal(canRoleManageCrossroadsMedia("venue_staff"), true);
    assert(ptz);
    assert(field6B);
    assert.equal(canControlCamera("parent", ptz), false);
    assert.equal(canControlCamera("venue_staff", ptz), true);
    assert.equal(canControlCamera("venue_staff", field6B), false);
  });

  it("security cameras are not treated as streamable production cameras", () => {
    const security = crossroadsVideoSources.find((source) => source.id === "video-security-concourse");

    assert(security);
    assert.equal(security.isSecurityCamera, true);
    assert.equal(isProductionCamera(security), false);
  });

  it("Presentation Mode includes Media Engine scene", () => {
    const mediaScene = crossroadsPresentationScenes.find((scene) => scene.id === "media-engine");

    assert(mediaScene);
    assert.equal(mediaScene.view, "media_engine");
    assert(mediaScene.talkingPoints.some((point) => point.includes("Create media once") || mediaScene.narrative?.includes("Create media once")));
  });
});
