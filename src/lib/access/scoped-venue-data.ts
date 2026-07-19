import { getSessionContext } from "@/lib/access/session";
import { managesAllVenues, venueInScope } from "@/lib/access/capabilities";
import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import type { Field, Venue } from "@/lib/types";

// Venues and fields limited to the caller's scope. Venue-scoped roles (GM,
// staff, tech) must not see — or write to — other venues' fields: identical
// field names across venues ("Field 1") make a mispick silent. Use this in any
// page or server action that offers a field/venue choice; client-side filtering
// alone is cosmetic.
export async function getScopedVenuesAndFields(): Promise<{ venues: Venue[]; fields: Field[] }> {
  const ctx = await getSessionContext();
  const [allVenues, allFields] = await Promise.all([getVenues(), getFields()]);
  const venues = managesAllVenues(ctx) ? allVenues : allVenues.filter((venue) => venueInScope(ctx, venue));
  const venueIds = new Set(venues.map((venue) => venue.id));
  return { venues, fields: allFields.filter((field) => venueIds.has(field.venueId)) };
}
