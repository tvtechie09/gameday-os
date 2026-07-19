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

// Organization ids the caller can reach, or `null` for NO restriction.
// managesAllVenues (platform/org admins) → null (every org, including orgs that
// own no venues — e.g. a sponsor-only org). A venue-scoped role → the org(s) of
// their own venue(s). Use it to object-level-guard ORG-scoped entities
// (sponsors, tournaments) whose by-id loaders don't filter by org — otherwise a
// venue GM (who holds sponsor.manage / venue.manage) can open another org's
// sponsor or tournament by URL. Guard shape: `if (orgIds && !orgIds.has(x))`.
export async function getScopedOrganizationIds(): Promise<Set<string> | null> {
  const ctx = await getSessionContext();
  if (managesAllVenues(ctx)) {
    return null;
  }
  const venues = (await getVenues()).filter((venue) => venueInScope(ctx, venue));
  return new Set(venues.map((venue) => venue.organizationId).filter((id): id is string => Boolean(id)));
}
