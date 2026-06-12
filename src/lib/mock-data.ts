import type { Sponsor, Venue } from "./types";

export const venues: Venue[] = [
  {
    id: "venue-north-complex",
    name: "Northside Sports Complex",
    description: "A multi-field youth sports venue built for tournament days.",
    city: "Oak Valley",
    state: "IL",
    address: "100 Park Loop",
    parkingNote: "Use the north lot near the main entrance.",
    fieldCount: 4,
    status: "Live",
    logoUrl: null,
    bannerUrl: null,
    mapImageUrl: null,
    mapNotes: null,
    primaryColor: null,
    secondaryColor: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "venue-river-park",
    name: "River Park Athletics",
    description: "A flexible community athletics venue with outdoor fields.",
    city: "Fairview",
    state: "IN",
    address: "45 Riverside Drive",
    parkingNote: "Overflow parking is available by the indoor facility.",
    fieldCount: 3,
    status: "Draft",
    logoUrl: null,
    bannerUrl: null,
    mapImageUrl: null,
    mapNotes: null,
    primaryColor: null,
    secondaryColor: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const sponsors: Sponsor[] = [
  {
    id: "sponsor-concession",
    name: "Concession Stand",
    logoUrl: null,
    websiteUrl: null,
    description: "Local concessions partner.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sponsor-equipment",
    name: "Equipment Partner",
    logoUrl: null,
    websiteUrl: null,
    description: "Equipment and training partner.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export function getVenueById(venueId: string) {
  return venues.find((venue) => venue.id === venueId);
}

export function getFieldSponsor() {
  return sponsors[0];
}
