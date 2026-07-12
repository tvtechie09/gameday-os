import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crossroadsEquipmentEndpoints, crossroadsGames } from "../src/lib/demo/crossroads.ts";
import {
  crossroadsFutureVisionItems,
  crossroadsPresentationModel,
  crossroadsPresentationRoute,
  crossroadsPresentationScenes,
} from "../src/lib/demo/crossroads-presentation.ts";
import {
  applyScenario,
  getCurrentDemoState,
  getNextSceneIndex,
  getPreviousSceneIndex,
  splitFutureVisionItems,
} from "../src/lib/demo/presentation.ts";

describe("Crossroads Presentation Mode", () => {
  it("exposes the presentation route model", () => {
    assert.equal(crossroadsPresentationRoute, "/demo/crossroads/presentation");
    assert.equal(crossroadsPresentationModel.route, crossroadsPresentationRoute);
    assert.equal(crossroadsPresentationModel.title, "Crossroads Experience Center");
  });

  it("has all scenes in the correct order", () => {
    assert.deepEqual(crossroadsPresentationScenes.map((scene) => scene.id), [
      "staff-readiness",
      "tournament-field-check",
      "families-arrive",
      "games-begin",
      "media-engine",
      "noon-high-traffic",
      "weather-delay",
      "recovery",
      "championship-community",
      "monday-morning-summary",
      "future-vision",
    ]);
    assert.deepEqual(crossroadsPresentationScenes.map((scene) => scene.time), [
      "7:00 AM",
      "7:30 AM",
      "7:45 AM",
      "8:00 AM",
      "8:15 AM",
      "Noon",
      "2:00 PM",
      "3:00 PM",
      "6:00 PM",
      "Monday Morning",
      "Future Vision",
    ]);
    assert(crossroadsPresentationScenes.every((scene) => scene.narrative && scene.visualState));
  });

  it("supports next, previous, restart, and jump style navigation indexes", () => {
    assert.equal(getNextSceneIndex(0, crossroadsPresentationScenes.length), 1);
    assert.equal(getNextSceneIndex(99, crossroadsPresentationScenes.length), crossroadsPresentationScenes.length - 1);
    assert.equal(getPreviousSceneIndex(3), 2);
    assert.equal(getPreviousSceneIndex(0), 0);
    assert(crossroadsPresentationScenes.some((scene) => scene.id === "weather-delay"));
  });

  it("scenario toggle updates isolated demo state", () => {
    const normal = applyScenario(crossroadsPresentationModel.baseState, "normal");
    const weatherDelay = applyScenario(crossroadsPresentationModel.baseState, "weather_delay");
    const championship = applyScenario(crossroadsPresentationModel.baseState, "championship");

    assert.equal(normal.field6BStatus, "live");
    assert.equal(normal.field4Status, "scheduled");
    assert.equal(normal.activeAlert, null);
    assert.equal(normal.gamesBehindSchedule, false);
    assert.deepEqual(normal.delayedSurfaceCodes, []);
    assert.equal(weatherDelay.weatherAlertIssued, true);
    assert.equal(weatherDelay.field4Status, "delayed");
    assert.equal(weatherDelay.field6BStatus, "delayed");
    assert(weatherDelay.delayedSurfaceCodes.includes("6B"));
    assert.equal(weatherDelay.announcementStatus, "pending");
    assert.equal(championship.announcementStatus, "sent");
    assert.equal(championship.field6BStatus, "live");
  });

  it("scene-level weather delay override updates demo state", () => {
    const weatherScene = crossroadsPresentationScenes.find((scene) => scene.id === "weather-delay");
    const state = getCurrentDemoState(crossroadsPresentationModel.baseState, "normal", weatherScene);

    assert.equal(state.weatherAlertIssued, true);
    assert.equal(state.announcementStatus, "pending");
    assert(state.delayedSurfaceCodes.includes("4C"));
    assert(state.delayedSurfaceCodes.includes("6B"));
    assert.equal(state.activeAlert?.includes("Weather delay issued"), true);
  });

  it("Championship Sunday scenario resets weather-delay scene state", () => {
    const weatherScene = crossroadsPresentationScenes.find((scene) => scene.id === "weather-delay");
    const state = getCurrentDemoState(crossroadsPresentationModel.baseState, "championship", weatherScene);

    assert.equal(state.weatherAlertIssued, false);
    assert.equal(state.field4Status, "live");
    assert.equal(state.field6BStatus, "live");
    assert.deepEqual(state.delayedSurfaceCodes, []);
    assert.equal(state.activeAlert?.includes("Championship Sunday"), true);
  });

  it("Future Vision separates foundation-ready, future, and partner approval items", () => {
    const grouped = splitFutureVisionItems(crossroadsFutureVisionItems);

    assert(grouped.architected.some((item) => item.title === "Digital signage"));
    assert(grouped.future.some((item) => item.title === "Scoreboard integration"));
    assert(grouped.partnerApproval.some((item) => item.title === "Cisco Spaces wayfinding"));
    assert(crossroadsFutureVisionItems.every((item) => item.status === "foundation ready" || item.requiresPartnerApproval || item.status === "roadmap"));
  });

  it("demo state simulation does not mutate real Crossroads data", () => {
    const originalGame = crossroadsGames.find((game) => game.surfaceCode === "6B");
    const originalEquipment = crossroadsEquipmentEndpoints.map((endpoint) => endpoint.status).join(",");

    const simulated = applyScenario(crossroadsPresentationModel.baseState, "weather_delay");

    assert.equal(originalGame?.status, "live");
    assert.equal(crossroadsEquipmentEndpoints.map((endpoint) => endpoint.status).join(","), originalEquipment);
    assert.equal(simulated.field6BStatus, "delayed");
  });
});
