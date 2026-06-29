import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  crossroadsEquipmentEndpoints,
  crossroadsFields,
  crossroadsGames,
  crossroadsHotspots,
  crossroadsParkingLots,
  crossroadsPlaySurfaces,
  crossroadsVenue,
  getCrossroadsSurface,
  getCrossroadsVenueModeContext,
  getFamilyModeContext,
  getTournamentModeContext,
  getVenueOperationsContext,
} from "../src/lib/demo/crossroads.ts";
import {
  crossroadsMaintenanceQrEntries,
  crossroadsMaintenanceRequests,
  getCrossroadsMaintenanceLocationLabel,
} from "../src/lib/demo/crossroads-maintenance.ts";

describe("Crossroads demo venue", () => {
  it("loads the flagship demo venue", () => {
    assert.equal(crossroadsVenue.name, "Wintrust Crossroads Sports Complex");
    assert.equal(crossroadsVenue.location, "New Lenox, IL");
    assert.equal(crossroadsVenue.heroImageUrl, "/demo/crossroads-map.png");
    assert.equal(crossroadsVenue.mapImageUrl, "/demo/crossroads-map.png");
  });

  it("contains 9 parent fields and the configured subfields", () => {
    assert.equal(crossroadsFields.length, 9);
    assert.equal(crossroadsPlaySurfaces.length, 22);
    assert(getCrossroadsSurface("1A"));
    assert(getCrossroadsSurface("2D"));
    assert(getCrossroadsSurface("3C"));
    assert(getCrossroadsSurface("4C"));
    assert(getCrossroadsSurface("6B"));
    assert(getCrossroadsSurface("9B"));
  });

  it("attaches a demo game schedule to subfield 6B", () => {
    const game = crossroadsGames.find((item) => item.surfaceCode === "6B");

    assert(game);
    assert.equal(game.surfaceId, "surface-6b");
    assert.equal(game.fieldId, "field-6");
    assert.equal(game.status, "live");
    assert.equal(game.homeTeam, "Cubs");
  });

  it("provides Venue Mode map and hotspot data", () => {
    const context = getCrossroadsVenueModeContext();

    assert.equal(context.mapImageUrl, "/demo/crossroads-map.png");
    assert(context.hotspots.some((hotspot) => hotspot.id === "main-gate"));
    assert(context.hotspots.some((hotspot) => hotspot.id === "field-6"));
    assert(context.hotspots.some((hotspot) => hotspot.id === "surface-6b"));
    assert(context.hotspots.some((hotspot) => hotspot.type === "parking"));
  });

  it("includes new POIs and lightweight media slots", () => {
    assert(crossroadsHotspots.some((hotspot) => hotspot.id === "championship-field"));
    assert(crossroadsHotspots.some((hotspot) => hotspot.id === "chill-zone"));
    assert(crossroadsHotspots.some((hotspot) => hotspot.id === "playground-family-area"));
    assert(crossroadsHotspots.some((hotspot) => hotspot.id === "main-concourse"));
    assert(crossroadsHotspots.some((hotspot) => hotspot.type === "seating"));
    assert(crossroadsHotspots.some((hotspot) => hotspot.imageUrl));
    assert(crossroadsFields.some((field) => field.imageUrl));
  });

  it("resolves Family Mode to South Lot and Field 6B", () => {
    const context = getFamilyModeContext();

    assert.equal(context.parking?.id, "south-lot");
    assert.equal(context.surface?.code, "6B");
    assert.equal(context.field?.id, "field-6");
    assert.equal(context.games[0]?.surfaceCode, "6B");
  });

  it("surfaces delayed and behind games for Tournament Mode", () => {
    const context = getTournamentModeContext();

    assert(context.delayedGames.some((game) => game.surfaceCode === "4C"));
    assert(context.behindGames.some((game) => game.behindMinutes > 0));
    assert(context.nextGames.length > 0);
  });

  it("shows equipment placeholders for Venue Operations Mode", () => {
    const context = getVenueOperationsContext();

    assert.equal(crossroadsEquipmentEndpoints.length, crossroadsFields.length * 5);
    assert(context.equipment.some((endpoint) => endpoint.type === "scoreboard"));
    assert(context.equipment.some((endpoint) => endpoint.type === "network"));
    assert(context.activeAlerts.length > 0);
  });

  it("includes Crossroads maintenance request examples", () => {
    const context = getVenueOperationsContext();
    const titles = context.maintenanceRequests.map((request) => request.title);

    assert.deepEqual(crossroadsMaintenanceRequests.map((request) => request.title), [
      "Trash overflow near Chill Zone",
      "Restroom supply issue",
      "Field 4B wet infield",
      "Scoreboard offline on Field 6",
    ]);
    assert(titles.includes("Trash overflow near Chill Zone"));
    assert(titles.includes("Restroom supply issue"));
    assert(titles.includes("Field 4B wet infield"));
    assert(titles.includes("Scoreboard offline on Field 6"));
  });

  it("provides staff QR maintenance entry points for fields, POIs, concessions, and equipment", () => {
    const context = getVenueOperationsContext();
    const routes = context.maintenanceQrEntries.map((entry) => entry.route);

    assert(crossroadsMaintenanceQrEntries.some((entry) => entry.route.includes("locationType=field")));
    assert(routes.some((route) => route.includes("locationType=field&locationId=field-6")));
    assert(routes.some((route) => route.includes("locationType=poi&locationId=restroom-south")));
    assert(routes.some((route) => route.includes("locationType=poi&locationId=concession-south")));
    assert(routes.some((route) => route.includes("locationType=equipment&locationId=field-6-scoreboard")));
  });

  it("resolves maintenance location labels", () => {
    assert.equal(getCrossroadsMaintenanceLocationLabel("field", "field-6"), "Field 6");
    assert.equal(getCrossroadsMaintenanceLocationLabel("poi", "chill-zone"), "Chill Zone / Hospitality");
    assert.equal(getCrossroadsMaintenanceLocationLabel("poi", "restroom-south"), "South Restroom");
    assert.equal(getCrossroadsMaintenanceLocationLabel("equipment", "field-6-scoreboard"), "Field 6 Scoreboard");
  });

  it("includes required parking lots", () => {
    assert(crossroadsParkingLots.some((lot) => lot.id === "north-lot"));
    assert(crossroadsParkingLots.some((lot) => lot.id === "west-southwest-lot"));
    assert(crossroadsParkingLots.some((lot) => lot.id === "south-lot"));
  });
});
