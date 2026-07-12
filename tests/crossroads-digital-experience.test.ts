import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { getCrossroadsDigitalExperienceContext, getCrossroadsTvPlaylist } from "../src/lib/demo/crossroads-digital-experience.ts";
import { getCrossroadsInfrastructureContext } from "../src/lib/demo/crossroads-infrastructure.ts";
import { displayChannels, futureVisionPhases, getCommunityDashboardContext, getCrossroadsTodayContext, operationsCenterTabs, qrContextViews, visitorServices } from "../src/lib/demo/crossroads-mayor.ts";
import { canAccessCrossroadsStaffMode, getCrossroadsSafetyContext, getCrossroadsStaffModeContext } from "../src/lib/demo/crossroads-safety.ts";
import { crossroadsPresentationScenes } from "../src/lib/demo/crossroads-presentation.ts";

describe("Crossroads Digital Experience expansion", () => {
  it("includes mayor-demo route and script files", () => {
    assert.equal(existsSync("src/app/demo/crossroads/today/page.tsx"), true);
    assert.equal(existsSync("src/app/demo/crossroads/operations/page.tsx"), true);
    assert.equal(existsSync("MAYOR_DEMO_SCRIPT.md"), true);
  });

  it("loads reusable Digital Experience models", () => {
    const context = getCrossroadsDigitalExperienceContext();

    assert(context.displayZones.some((zone) => zone.name === "Chill Zone TVs"));
    assert(context.displayZones.some((zone) => zone.name === "Venue TV Dashboard"));
    assert(context.contentItems.some((item) => item.title === "Live Scores Board"));
    assert(context.contentItems.some((item) => item.title === "Emergency Shelter Instruction"));
    assert(context.playlists.some((playlist) => playlist.name === "Crossroads TV Rotation"));
  });

  it("seeds Crossroads display endpoints correctly", () => {
    const context = getCrossroadsDigitalExperienceContext();
    const endpointNames = context.displayEndpoints.map((endpoint) => endpoint.name);

    assert(endpointNames.includes("Chill Zone TV 1"));
    assert(endpointNames.includes("Bar TV 1"));
    assert(endpointNames.includes("South Menu Board"));
    assert(endpointNames.includes("Future Outdoor Digital Signage"));
  });

  it("TV dashboard data renders playlists and emergency override content", () => {
    const tv = getCrossroadsTvPlaylist("daktronics");

    assert.equal(tv.board.venue.id, "crossroads");
    assert.equal(tv.hasEmergencyOverride, true);
    assert(tv.items.every((item) => item.priority === "emergency"));
    assert.equal(tv.items[0]?.title, "Emergency Shelter Instruction");
  });

  it("Staff Mode is permission aware and renders tasks", () => {
    const staff = getCrossroadsStaffModeContext("maintenance_staff");
    const parent = getCrossroadsStaffModeContext("parent");

    assert.equal(canAccessCrossroadsStaffMode("maintenance_staff"), true);
    assert.equal(parent.allowed, false);
    assert.equal(staff.allowed, true);
    assert(staff.tasks.length > 0);
    assert(staff.maintenanceRequests.some((request) => request.title === "Scoreboard offline on Field 6"));
  });

  it("Safety notices render for Venue Operations", () => {
    const safety = getCrossroadsSafetyContext();

    assert(safety.activeNotices.some((notice) => notice.title === "Lightning Delay"));
    assert(safety.emergencyScenarios.some((scenario) => scenario.title === "Tornado Shelter Guidance"));
    assert(safety.shelterLocations.some((location) => location.name === "Main Building Interior"));
  });

  it("building infrastructure POIs and future access-control areas exist", () => {
    const infrastructure = getCrossroadsInfrastructureContext();

    assert(infrastructure.infrastructure.some((item) => item.infrastructureType === "electrical_room"));
    assert(infrastructure.infrastructure.some((item) => item.infrastructureType === "concession_counter"));
    assert(infrastructure.accessAreas.some((area) => area.name === "Fire Sprinkler and Electrical Room"));
    assert(infrastructure.accessAreas.every((area) => area.notes.toLowerCase().includes("future") || area.notes.toLowerCase().includes("demo") || area.notes.toLowerCase().includes("staff")));
  });

  it("Presentation Mode includes digital experience scenes in the Saturday story", () => {
    const gamesBeginIndex = crossroadsPresentationScenes.findIndex((scene) => scene.id === "games-begin");
    const championshipIndex = crossroadsPresentationScenes.findIndex((scene) => scene.id === "championship-community");

    assert(gamesBeginIndex > -1);
    assert(championshipIndex > gamesBeginIndex);
    assert.equal(crossroadsPresentationScenes[gamesBeginIndex]?.view, "digital_experience");
    assert.equal(crossroadsPresentationScenes[championshipIndex]?.view, "digital_experience");
  });

  it("Crossroads Today context renders the mayor demo front door", () => {
    const today = getCrossroadsTodayContext();

    assert.equal(today.venue.id, "crossroads");
    assert.equal(today.eventTitle, "Crossroads Summer Classic");
    assert.equal(today.gamesToday > 0, true);
    assert.equal(today.visitorEstimate, "8,400");
    assert(today.announcements.some((announcement) => announcement.title === "Explore New Lenox"));
  });

  it("Visitor Services, QR Context, Community Dashboard, channels, and phases are modeled", () => {
    const community = getCommunityDashboardContext();

    assert(visitorServices.some((service) => service.title === "First Aid / AED"));
    assert(visitorServices.some((service) => service.title === "Emergency Shelter Guidance"));
    assert(qrContextViews.some((view) => view.role === "parent" && view.items.some((item) => item.includes("Directions"))));
    assert(qrContextViews.some((view) => view.role === "staff" && view.items.some((item) => item.toLowerCase().includes("maintenance"))));
    assert(qrContextViews.some((view) => view.role === "tournament" && view.items.some((item) => item.toLowerCase().includes("readiness"))));
    assert(community.events.some((event) => event.title === "New Lenox Community Night"));
    assert(displayChannels.map((channel) => channel.name).includes("Crossroads Live"));
    assert(displayChannels.map((channel) => channel.name).includes("Weather & Safety"));
    assert(operationsCenterTabs.includes("Community"));
    assert(futureVisionPhases.some((phase) => phase.title === "Connected Municipality"));
    assert(futureVisionPhases.every((phase) => phase.items.every((item) => ["available in demo", "platform foundation", "future integration", "partner/vendor required"].includes(item.status))));
  });
});
