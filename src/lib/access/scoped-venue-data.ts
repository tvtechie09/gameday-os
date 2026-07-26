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

// Write-side guard for FIELD-scoped mutations (work orders / issues): throw
// unless the field belongs to a venue in the caller's scope. Same shape as
// assertVenueInScope, for the many actions that only carry a fieldId.
export async function assertFieldInScope(fieldId: string | null | undefined): Promise<void> {
  if (!fieldId) {
    return;
  }
  const { fields } = await getScopedVenuesAndFields();
  if (!fields.some((field) => field.id === fieldId)) {
    throw new OrganizationScopeError();
  }
}

export class OrganizationScopeError extends Error {
  constructor() {
    super("You are not authorized to act on this organization's data.");
    this.name = "OrganizationScopeError";
  }
}

// Write-side guard for ORG-scoped mutations (sponsors, campaigns): throw unless
// the caller can reach the target org. Call it in the server action BEFORE the
// write, after loading the target's organizationId. A null/absent org id is an
// unowned entity and is allowed; platform/org admins (null scope) pass.
export async function assertOrganizationInScope(organizationId: string | null | undefined): Promise<void> {
  if (!organizationId) {
    return;
  }
  const scopedOrgIds = await getScopedOrganizationIds();
  if (scopedOrgIds && !scopedOrgIds.has(organizationId)) {
    throw new OrganizationScopeError();
  }
}

// Write-side guard for VENUE-scoped mutations: throw unless the target venue is
// in the caller's scope. Call it in the server action BEFORE the write. A
// null/absent venue id is allowed; platform/org admins (managesAllVenues) pass.
export async function assertVenueInScope(venueId: string | null | undefined): Promise<void> {
  if (!venueId) {
    return;
  }
  const ctx = await getSessionContext();
  if (managesAllVenues(ctx)) {
    return;
  }
  const venues = (await getVenues()).filter((venue) => venueInScope(ctx, venue));
  if (!venues.some((venue) => venue.id === venueId)) {
    throw new OrganizationScopeError();
  }
}
