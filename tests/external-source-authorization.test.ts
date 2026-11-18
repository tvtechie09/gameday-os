import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { externalSourceImportScopeError } from "../src/lib/services/external-source-scope.ts";

describe("external source mutation authorization", () => {
  it("allows canonical fields from the external source venue", () => {
    assert.equal(externalSourceImportScopeError("venue-a", ["field-a", "field-b"], [
      { id: "field-a", venueId: "venue-a" },
      { id: "field-b", venueId: "venue-a" },
    ]), null);
  });

  it("denies foreign, missing, and blank field targets before queue creation", () => {
    assert.match(externalSourceImportScopeError("venue-a", ["field-b"], [{ id: "field-b", venueId: "venue-b" }]) ?? "", /outside the external source venue/);
    assert.match(externalSourceImportScopeError("venue-a", ["field-missing"], []) ?? "", /not available/);
    assert.match(externalSourceImportScopeError("venue-a", [""], []) ?? "", /requires a canonical field/);
  });

  it("requires verified actors at every external-source server-action caller", () => {
    const createPage = readFileSync("src/app/admin/integrations/new/page.tsx", "utf8");
    const importAdapter = readFileSync("src/app/admin/integrations/calendar-import-adapter.tsx", "utf8");
    const healthActions = readFileSync("src/app/admin/integrations/health/actions.ts", "utf8");
    const importActions = readFileSync("src/app/admin/integrations/import-actions.ts", "utf8");
    assert.match(createPage, /createExternalSource\([\s\S]*await getVerifiedVenueActorId\(\)\)/);
    assert.match(healthActions, /updateExternalSourceStatus\([\s\S]*await getVerifiedVenueActorId\(\)\)/);
    assert.match(healthActions, /runExternalSourceTestSync\(sourceId, await getVerifiedVenueActorId\(\)\)/);
    assert.match(importAdapter, /fetchCalendarEventsAction\(feedUrl, sourceId\)/);
    assert.match(importActions, /getAuthorizedExternalSource\(sourceId, await getVerifiedVenueActorId\(\), "integrations\.view"\)/);
    assert.match(importActions, /getAuthorizedExternalSource\(sourceId, actorUserId, "integrations\.sync"\)/);
    assert.match(importActions, /externalSourceImportScopeError[\s\S]*createSyncJobWithQueue/);
  });

  it("enforces permissions and canonical venue ids inside the mutation service", () => {
    const service = readFileSync("src/lib/services/external-sources.ts", "utf8");
    assert.match(service, /requirePermission\(actor, "integrations\.create", "venue", venue\.id\)/);
    assert.match(service, /getAuthorizedExternalSource\(id, actor, "integrations\.edit"\)/);
    assert.match(service, /getAuthorizedExternalSource\(id, actor, "integrations\.sync"\)/);
    assert.match(service, /organization_id: venue\.organization_id/);
    assert.match(service, /venue_id: venue\.id/);
    assert.doesNotMatch(service, /venue_id: data\.venue_id/);
  });
});
