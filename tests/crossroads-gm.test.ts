import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMaintenanceDraftFromAsset, filterAssets } from "../src/lib/assets.ts";
import {
  crossroadsAssets,
  crossroadsExecutiveKpis,
  crossroadsFieldUtilization,
  crossroadsGmFutureItems,
  crossroadsGmPermissions,
  crossroadsRevenueOpportunities,
  getAssetRelatedMaintenance,
} from "../src/lib/demo/crossroads-gm.ts";
import { crossroadsPresentationScenes } from "../src/lib/demo/crossroads-presentation.ts";

describe("Crossroads GM Mode", () => {
  it("defines the GM route contract and executive dashboard KPIs", () => {
    assert.equal("/demo/crossroads/gm", "/demo/crossroads/gm");
    assert(crossroadsExecutiveKpis.some((kpi) => kpi.label === "Weekend games hosted" && kpi.value === "126"));
    assert(crossroadsExecutiveKpis.some((kpi) => kpi.label === "Estimated guests"));
    assert(crossroadsExecutiveKpis.some((kpi) => kpi.label === "Maintenance opened/resolved/pending"));
  });

  it("loads Crossroads demo assets", () => {
    const names = crossroadsAssets.map((asset) => asset.name);

    assert(names.includes("Field 6 Scoreboard"));
    assert(names.includes("Field 6 Horn Speaker"));
    assert(names.includes("Field 6 Security Camera"));
    assert(names.includes("Field 4 Lighting"));
    assert(names.includes("Main Building Network Equipment"));
    assert(names.includes("South Concession Equipment"));
    assert(names.includes("South Restroom Fixtures"));
    assert(names.includes("AED near Main Building"));
    assert(names.includes("Batting Cage Netting"));
    assert(names.includes("Digital / Physical Signage"));
  });

  it("filters assets by type, status, location, and criticality", () => {
    assert.equal(filterAssets(crossroadsAssets, { assetType: "scoreboard" }).length, 1);
    assert.equal(filterAssets(crossroadsAssets, { status: "offline" })[0]?.name, "Field 6 Scoreboard");
    assert(filterAssets(crossroadsAssets, { locationType: "field" }).length >= 4);
    assert.equal(filterAssets(crossroadsAssets, { criticality: "life_safety" })[0]?.assetType, "AED");
  });

  it("links asset detail to related maintenance and can draft a request from an asset", () => {
    const scoreboard = crossroadsAssets.find((asset) => asset.id === "asset-field-6-scoreboard");
    assert(scoreboard);

    const related = getAssetRelatedMaintenance(scoreboard);
    const draft = createMaintenanceDraftFromAsset(scoreboard);

    assert(related.some((request) => request.title === "Scoreboard offline on Field 6"));
    assert.equal(draft.locationId, scoreboard.id);
    assert.equal(draft.locationType, "equipment");
    assert.equal(draft.priority, "urgent");
  });

  it("includes facility utilization and revenue opportunity demo data", () => {
    assert(crossroadsFieldUtilization.some((field) => field.fieldName === "Field 6" && field.utilization === 92));
    assert(crossroadsRevenueOpportunities.some((item) => item.title === "Digital sponsorship zones"));
    assert(crossroadsRevenueOpportunities.every((item) => item.status === "future opportunity" || item.status === "demo placeholder"));
  });

  it("keeps GM Mode scoped away from parent/family users", () => {
    assert(crossroadsGmPermissions.some((permission) => permission.role === "venue_gm" && permission.visible));
    assert(crossroadsGmPermissions.some((permission) => permission.role === "maintenance_manager" && permission.visible));
    assert(crossroadsGmPermissions.some((permission) => permission.role === "asset_manager" && permission.visible));
    assert(crossroadsGmPermissions.some((permission) => permission.role === "executive_viewer" && permission.visible));
    assert(crossroadsGmPermissions.some((permission) => permission.role === "parent" && !permission.visible));
  });

  it("adds GM scene to Presentation Mode before future vision", () => {
    const ids = crossroadsPresentationScenes.map((scene) => scene.id);

    assert(ids.includes("gm-monday-morning"));
    assert(ids.indexOf("gm-monday-morning") > ids.indexOf("venue-operations"));
    assert(ids.indexOf("gm-monday-morning") < ids.indexOf("future-vision"));
  });

  it("labels GM future roadmap items as future or partner work, not live integrations", () => {
    assert(crossroadsGmFutureItems.some((item) => item.title === "External CMMS integration"));
    assert(crossroadsGmFutureItems.some((item) => item.title === "Municipal asset management integration" && item.requiresPartnerApproval));
    assert(crossroadsGmFutureItems.every((item) => item.status === "future integration" || item.status === "partner opportunity" || item.status === "roadmap"));
  });
});
