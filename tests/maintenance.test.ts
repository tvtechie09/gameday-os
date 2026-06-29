import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  closeExternalTicket,
  createExternalTicket,
  createMaintenanceRequest,
  syncExternalTicketStatus,
  updateMaintenanceStatus,
} from "../src/lib/maintenance.ts";

describe("GameDay Venue maintenance model", () => {
  it("creates local maintenance requests without external ticketing side effects", () => {
    const request = createMaintenanceRequest({
      category: "field",
      description: "Wet dirt near first base.",
      locationId: "surface-4b",
      locationType: "playSurface",
      priority: "high",
      reportedByRole: "field marshal",
      title: "Field 4B needs attention",
      venueId: "crossroads",
    }, new Date("2026-06-29T12:00:00.000Z"));

    assert.equal(request.status, "new");
    assert.equal(request.assignedTo, "Unassigned");
    assert.equal(request.externalTicketId, undefined);
    assert.equal(request.createdAt, "2026-06-29T12:00:00.000Z");
  });

  it("updates request status with a new timestamp", () => {
    const request = createMaintenanceRequest({
      category: "trash",
      description: "Overflowing bin.",
      locationId: "chill-zone",
      locationType: "poi",
      priority: "medium",
      reportedByRole: "venue staff",
      title: "Trash overflow",
      venueId: "crossroads",
    }, new Date("2026-06-29T12:00:00.000Z"));
    const updated = updateMaintenanceStatus(request, "in_progress", new Date("2026-06-29T12:10:00.000Z"));

    assert.equal(updated.status, "in_progress");
    assert.equal(updated.updatedAt, "2026-06-29T12:10:00.000Z");
  });

  it("keeps external ticket functions provider-ready and labeled as future integration", async () => {
    const request = createMaintenanceRequest({
      category: "scoreboard",
      description: "Scoreboard offline.",
      locationId: "field-6-scoreboard",
      locationType: "equipment",
      priority: "high",
      reportedByRole: "scorekeeper",
      title: "Scoreboard offline",
      venueId: "crossroads",
    }, new Date("2026-06-29T12:00:00.000Z"));
    const external = await createExternalTicket(request);
    const synced = await syncExternalTicketStatus(request);
    const closed = await closeExternalTicket(request);

    assert.equal(external.providerStatus, "future_integration");
    assert.match(external.message, /No external ticketing or CMMS platform is connected/);
    assert.equal(synced.id, request.id);
    assert.equal(closed.status, "closed");
  });
});
