import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { syncQueueFieldScopeError, syncQueueSourceVenueError } from "../src/lib/services/sync-queue-scope.ts";

describe("sync-engine mutation authorization", () => {
  it("requires every non-empty queue target to resolve canonically", () => {
    assert.equal(syncQueueFieldScopeError([], []), null);
    assert.equal(syncQueueFieldScopeError(["field-a", "field-a"], [{ id: "field-a", venueId: "venue-a" }]), null);
    assert.match(syncQueueFieldScopeError(["field-missing"], []) ?? "", /not available/);
    assert.match(syncQueueFieldScopeError([""], []) ?? "", /requires a canonical field/);
  });

  it("denies source-backed records that target another venue", () => {
    assert.equal(syncQueueSourceVenueError("venue-a", [{ id: "field-a", venueId: "venue-a" }]), null);
    assert.match(syncQueueSourceVenueError("venue-a", [{ id: "field-b", venueId: "venue-b" }]) ?? "", /outside the external source venue/);
  });

  it("requires verified actors at CSV, calendar, review, and import action callers", () => {
    const csvActions = readFileSync("src/app/admin/import/actions.ts", "utf8");
    const calendarActions = readFileSync("src/app/admin/integrations/import-actions.ts", "utf8");
    const syncActions = readFileSync("src/app/admin/sync/actions.ts", "utf8");
    assert.match(csvActions, /const actorUserId = await getVerifiedVenueActorId\(\)[\s\S]*createSyncJobWithQueue\([\s\S]*actorUserId\)/);
    assert.match(calendarActions, /createSyncJobWithQueue\([\s\S]*actorUserId\)/);
    assert.match(syncActions, /updateSyncQueueReviewStatus\(id, "approved", await getVerifiedVenueActorId\(\)\)/);
    assert.match(syncActions, /updateSyncQueueReviewStatus\(id, "rejected", await getVerifiedVenueActorId\(\)\)/);
    assert.match(syncActions, /importSyncQueueItem\(id, await getVerifiedVenueActorId\(\)\)/);
  });

  it("authorizes canonical field venues before service-role mutations", () => {
    const service = readFileSync("src/lib/services/sync-engine.ts", "utf8");
    const createBoundary = service.slice(service.indexOf("export async function createSyncJobWithQueue"), service.indexOf("export async function getSyncJobs"));
    const reviewBoundary = service.slice(service.indexOf("export async function updateSyncQueueReviewStatus"), service.indexOf("export async function importSyncQueueItem"));
    const importBoundary = service.slice(service.indexOf("export async function importSyncQueueItem"), service.indexOf("async function nextJobCount"));

    assert.match(createBoundary, /loadCanonicalSyncFields[\s\S]*authorizeSyncFields[\s\S]*\.from\("sync_jobs"\)[\s\S]*\.insert/);
    assert.match(createBoundary, /getAuthorizedExternalSource[\s\S]*syncQueueSourceVenueError/);
    assert.match(reviewBoundary, /getAuthorizedSyncQueueItem[\s\S]*\.update/);
    assert.match(importBoundary, /getAuthorizedSyncQueueItem[\s\S]*getSessionsByFieldId\(field\.id\)[\s\S]*createSession/);
    assert.doesNotMatch(importBoundary, /getSessions\(\)/);
  });
});
