import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getScopedSyncReadIds } from "../src/lib/services/sync-read-scope.ts";

const venues = new Set(["venue-a"]);

describe("sync dashboard tenant scope", () => {
  it("returns a job and queue rows wholly contained in the caller's venues", () => {
    const result = getScopedSyncReadIds({
      allowedVenueIds: venues,
      jobs: [{ id: "job-a" }],
      jobVenues: [{ syncJobId: "job-a", venueId: "venue-a" }],
      queue: [{ id: "queue-a", syncJobId: "job-a", venueId: "venue-a" }],
    });
    assert.deepEqual([...result.jobIds], ["job-a"]);
    assert.deepEqual([...result.queueIds], ["queue-a"]);
  });

  it("hides the entire job when any queue row crosses the tenant boundary", () => {
    const result = getScopedSyncReadIds({
      allowedVenueIds: venues,
      jobs: [{ id: "job-mixed" }],
      jobVenues: [
        { syncJobId: "job-mixed", venueId: "venue-a" },
        { syncJobId: "job-mixed", venueId: "venue-b" },
      ],
      queue: [
        { id: "queue-a", syncJobId: "job-mixed", venueId: "venue-a" },
        { id: "queue-b", syncJobId: "job-mixed", venueId: "venue-b" },
      ],
    });
    assert.equal(result.jobIds.size, 0);
    assert.equal(result.queueIds.size, 0);
  });

  it("uses durable ownership for empty source jobs and hides unowned CSV jobs", () => {
    const result = getScopedSyncReadIds({
      allowedVenueIds: venues,
      jobs: [
        { id: "job-source-a" },
        { id: "job-source-b" },
        { id: "job-unscoped" },
      ],
      jobVenues: [
        { syncJobId: "job-source-a", venueId: "venue-a" },
        { syncJobId: "job-source-b", venueId: "venue-b" },
      ],
      queue: [],
    });
    assert.deepEqual([...result.jobIds], ["job-source-a"]);
  });

  it("requires job ownership and each queue row to be in scope", () => {
    const result = getScopedSyncReadIds({
      allowedVenueIds: venues,
      jobs: [{ id: "job-source-b" }],
      jobVenues: [{ syncJobId: "job-source-b", venueId: "venue-b" }],
      queue: [{ id: "queue-a", syncJobId: "job-source-b", venueId: "venue-a" }],
    });
    assert.equal(result.jobIds.size, 0);
    assert.equal(result.queueIds.size, 0);
  });

  it("hides a canonically owned job when any legacy queue row is unattributed", () => {
    const result = getScopedSyncReadIds({
      allowedVenueIds: venues,
      jobs: [{ id: "job-ambiguous" }],
      jobVenues: [{ syncJobId: "job-ambiguous", venueId: "venue-a" }],
      queue: [{ id: "queue-ambiguous", syncJobId: "job-ambiguous", venueId: null }],
    });
    assert.equal(result.jobIds.size, 0);
    assert.equal(result.queueIds.size, 0);
  });

  it("derives read scope from the trusted server session before returning service-role rows", () => {
    const service = readFileSync("src/lib/services/sync-engine.ts", "utf8");
    const snapshot = service.slice(service.indexOf("async function loadScopedSyncSnapshot"), service.indexOf("export async function updateSyncQueueReviewStatus"));
    assert.match(snapshot, /getScopedVenuesAndFields\(\)/);
    assert.match(snapshot, /getScopedSyncReadIds/);
    assert.match(snapshot, /jobs: jobs\.filter\(\(job\) => jobIds\.has\(job\.id\)\)/);
    assert.match(snapshot, /queue: queue\.filter\(\(item\) => queueIds\.has\(item\.id\)/);
  });
});
