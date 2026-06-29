import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFallbackPlaySurfaces,
  buildScheduleBySurface,
  buildVenueModeLiveStatus,
  buildVenueModeQrEntries,
  getSessionsForVenueOnDate,
  type VenueModeFieldLike,
  type VenueModePlaySurfaceLike,
  type VenueModeSessionLike,
} from "../src/lib/venue-mode-helpers.ts";

const parentField: VenueModeFieldLike = {
  id: "field-3",
  layoutRole: "parent",
  name: "Field 3",
  organizationId: "org-1",
  sportType: "baseball",
  status: "open",
  updatedAt: "2026-06-25T12:00:00.000Z",
  venueId: "venue-1",
};

const splitSurfaces: VenueModePlaySurfaceLike[] = [
  {
    capacity: null,
    createdAt: "2026-06-25T12:00:00.000Z",
    fieldId: null,
    id: "surface-3-full",
    layoutRole: "parent",
    mapLabel: "3",
    mapX: 40,
    mapY: 50,
    name: "Field 3 Full",
    organizationId: "org-1",
    parentFieldId: "field-3",
    sortOrder: 0,
    sportTypes: ["baseball"],
    status: "open",
    surfaceCode: "3",
    surfaceType: "diamond",
    updatedAt: "2026-06-25T12:00:00.000Z",
    venueId: "venue-1",
    zoneId: "zone-east",
  },
  {
    capacity: null,
    createdAt: "2026-06-25T12:00:00.000Z",
    fieldId: null,
    id: "surface-3a",
    layoutRole: "split_child",
    mapLabel: "3A",
    mapX: 30,
    mapY: 44,
    name: "3A",
    organizationId: "org-1",
    parentFieldId: "field-3",
    sortOrder: 1,
    sportTypes: ["baseball"],
    status: "active",
    surfaceCode: "3A",
    surfaceType: "diamond",
    updatedAt: "2026-06-25T12:00:00.000Z",
    venueId: "venue-1",
    zoneId: "zone-east",
  },
  {
    capacity: null,
    createdAt: "2026-06-25T12:00:00.000Z",
    fieldId: null,
    id: "surface-3b",
    layoutRole: "split_child",
    mapLabel: "3B",
    mapX: 45,
    mapY: 44,
    name: "3B",
    organizationId: "org-1",
    parentFieldId: "field-3",
    sortOrder: 2,
    sportTypes: ["baseball"],
    status: "delayed",
    surfaceCode: "3B",
    surfaceType: "diamond",
    updatedAt: "2026-06-25T12:00:00.000Z",
    venueId: "venue-1",
    zoneId: "zone-east",
  },
  {
    capacity: null,
    createdAt: "2026-06-25T12:00:00.000Z",
    fieldId: null,
    id: "surface-3c",
    layoutRole: "split_child",
    mapLabel: "3C",
    mapX: 60,
    mapY: 44,
    name: "3C",
    organizationId: "org-1",
    parentFieldId: "field-3",
    sortOrder: 3,
    sportTypes: ["baseball"],
    status: "open",
    surfaceCode: "3C",
    surfaceType: "diamond",
    updatedAt: "2026-06-25T12:00:00.000Z",
    venueId: "venue-1",
    zoneId: "zone-east",
  },
];

const sessions: VenueModeSessionLike[] = [
  {
    fieldId: "field-3",
    gameStatus: "active",
    id: "session-3a",
    playSurfaceId: "surface-3a",
    startTime: "2026-06-25T18:00:00.000Z",
    status: "active",
    title: "Game on 3A",
  },
  {
    fieldId: "field-3",
    id: "session-3b",
    playSurfaceId: "surface-3b",
    startTime: "2026-06-25T19:00:00.000Z",
    status: "scheduled",
    title: "Game on 3B",
  },
  {
    fieldId: "field-3",
    id: "session-tomorrow",
    playSurfaceId: "surface-3c",
    startTime: "2026-06-26T19:00:00.000Z",
    status: "scheduled",
    title: "Tomorrow on 3C",
  },
];

describe("Venue Mode hierarchy helpers", () => {
  it("keeps legacy fields working by treating fields as fallback play surfaces", () => {
    const fallback = buildFallbackPlaySurfaces([parentField]);

    assert.equal(fallback.length, 1);
    assert.equal(fallback[0]?.fieldId, "field-3");
    assert.equal(fallback[0]?.layoutRole, "parent");
    assert.equal(fallback[0]?.name, "Field 3");
  });

  it("filters today's venue sessions and keeps play-surface assignments", () => {
    const today = getSessionsForVenueOnDate([parentField], sessions, new Date("2026-06-25T12:00:00.000Z"));

    assert.deepEqual(today.map((session) => session.id), ["session-3a", "session-3b"]);
    assert.equal(today[0]?.playSurfaceId, "surface-3a");
    assert.equal(today[1]?.playSurfaceId, "surface-3b");
  });

  it("groups schedules by configured play surface instead of only the parent field", () => {
    const today = getSessionsForVenueOnDate([parentField], sessions, new Date("2026-06-25T12:00:00.000Z"));
    const groups = buildScheduleBySurface(splitSurfaces, today);
    const groupBySurfaceId = new Map(groups.map((group) => [group.surfaceId, group]));

    assert.equal(groupBySurfaceId.get("surface-3a")?.sessions[0]?.id, "session-3a");
    assert.equal(groupBySurfaceId.get("surface-3b")?.sessions[0]?.id, "session-3b");
    assert.equal(groupBySurfaceId.get("surface-3c")?.sessions.length, 0);
  });

  it("creates QR entries for venue, parent field, specific play surfaces, and configured QR endpoints", () => {
    const entries = buildVenueModeQrEntries(
      { id: "venue-1", name: "Demo Venue" },
      [parentField],
      splitSurfaces,
      [{ endpointLabel: "North Gate QR", endpointType: "qr_entry", endpointUrl: "https://app.example.com/gate/north", id: "endpoint-1" }],
      {
        fieldUrl: (fieldId) => `https://app.example.com/fields/${fieldId}`,
        venueDisplayUrl: (venueId) => `https://app.example.com/display/venue/${venueId}`,
        venueUrl: (venueId) => `https://app.example.com/venues/${venueId}`,
      },
    );

    assert(entries.some((entry) => entry.entryType === "venue" && entry.url.endsWith("/venues/venue-1")));
    assert(entries.some((entry) => entry.entryType === "parent_field" && entry.fieldId === "field-3"));
    assert(entries.some((entry) => entry.entryType === "play_surface" && entry.playSurfaceId === "surface-3a" && entry.url.endsWith("/fields/field-3?surface=surface-3a")));
    assert(entries.some((entry) => entry.entryType === "endpoint" && entry.endpointId === "endpoint-1"));
  });

  it("summarizes live status across play surfaces and active sessions", () => {
    const today = getSessionsForVenueOnDate([parentField], sessions, new Date("2026-06-25T12:00:00.000Z"));
    const status = buildVenueModeLiveStatus(splitSurfaces, today);

    assert.equal(status.totalSurfaces, 4);
    assert.equal(status.activeSurfaces, 1);
    assert.equal(status.delayedSurfaces, 1);
    assert.equal(status.openSurfaces, 2);
    assert.equal(status.activeSessions, 1);
  });
});
