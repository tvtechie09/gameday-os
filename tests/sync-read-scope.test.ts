import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getScopedSyncReadIds } from "../src/lib/services/sync-read-scope.ts";

const fields = new Set(["field-a"]);
const venues = new Set(["venue-a"]);

describe("sync dashboard tenant scope", () => {
  it("returns a job and queue rows wholly contained in the caller's fields", () => {
    const result = getScopedSyncReadIds({
      allowedFieldIds: fields,
      allowedVenueIds: venues,
      jobs: [{ id: "job-a", sourceId: null }],
      queue: [{ fieldId: "field-a", id: "queue-a", syncJobId: "job-a" }],
      sources: [],
    });
    assert.deepEqual([...result.jobIds], ["job-a"]);
    assert.deepEqual([...result.queueIds], ["queue-a"]);
  });

  it("hides the entire job when any queue row crosses the tenant boundary", () => {
    const result = getScopedSyncReadIds({
      allowedFieldIds: fields,
      allowedVenueIds: venues,
      jobs: [{ id: "job-mixed", sourceId: null }],
      queue: [
        { fieldId: "field-a", id: "queue-a", syncJobId: "job-mixed" },
        { fieldId: "field-b", id: "queue-b", syncJobId: "job-mixed" },
      ],
      sources: [],
    });
    assert.equal(result.jobIds.size, 0);
    assert.equal(result.queueIds.size, 0);
  });

  it("scopes empty source jobs by canonical source venue and hides unscoped CSV jobs", () => {
    const result = getScopedSyncReadIds({
      allowedFieldIds: fields,
      allowedVenueIds: venues,
      jobs: [
        { id: "job-source-a", sourceId: "source-a" },
        { id: "job-source-b", sourceId: "source-b" },
        { id: "job-unscoped", sourceId: null },
      ],
      queue: [],
      sources: [
        { id: "source-a", venueId: "venue-a" },
        { id: "source-b", venueId: "venue-b" },
      ],
    });
    assert.deepEqual([...result.jobIds], ["job-source-a"]);
  });

  it("requires both source venue and every field to be in scope", () => {
    const result = getScopedSyncReadIds({
      allowedFieldIds: fields,
      allowedVenueIds: venues,
      jobs: [{ id: "job-source-b", sourceId: "source-b" }],
      queue: [{ fieldId: "field-a", id: "queue-a", syncJobId: "job-source-b" }],
      sources: [{ id: "source-b", venueId: "venue-b" }],
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
