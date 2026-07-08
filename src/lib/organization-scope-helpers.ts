export const allOrganizationsScope = "all";

const organizationPrefix = "org:";
const venuePrefix = "venue:";

export type ScopeSelection =
  | { type: "all" }
  | { type: "organization"; organizationId: string }
  | { type: "venue"; venueId: string };

export type ScopeOrganizationLike = {
  id: string;
  name: string;
};

export type ScopeVenueLike = {
  id: string;
  name: string;
  organizationId?: string | null;
};

export type ScopeSwitcherOption = {
  value: string;
  label: string;
};

export type ScopeSwitcherGroup = {
  label: string;
  options: ScopeSwitcherOption[];
};

export function parseScopeValue(value: string | null | undefined): ScopeSelection {
  if (!value || value === allOrganizationsScope) {
    return { type: "all" };
  }

  if (value.startsWith(venuePrefix)) {
    const venueId = value.slice(venuePrefix.length);
    return venueId ? { type: "venue", venueId } : { type: "all" };
  }

  if (value.startsWith(organizationPrefix)) {
    const organizationId = value.slice(organizationPrefix.length);
    return organizationId ? { type: "organization", organizationId } : { type: "all" };
  }

  // Legacy cookies stored a bare organization id with no prefix.
  return { type: "organization", organizationId: value };
}

export function serializeScopeValue(selection: ScopeSelection): string {
  switch (selection.type) {
    case "organization":
      return `${organizationPrefix}${selection.organizationId}`;
    case "venue":
      return `${venuePrefix}${selection.venueId}`;
    default:
      return allOrganizationsScope;
  }
}

export function normalizeScopeSelection(
  selection: ScopeSelection,
  organizations: ScopeOrganizationLike[],
  venues: ScopeVenueLike[],
): ScopeSelection {
  if (selection.type === "organization") {
    return organizations.some((organization) => organization.id === selection.organizationId)
      ? selection
      : { type: "all" };
  }

  if (selection.type === "venue") {
    return venues.some((venue) => venue.id === selection.venueId) ? selection : { type: "all" };
  }

  return { type: "all" };
}

export function resolveScopeOrganizationId(
  selection: ScopeSelection,
  venues: ScopeVenueLike[],
): string | null {
  if (selection.type === "organization") {
    return selection.organizationId;
  }

  if (selection.type === "venue") {
    const venue = venues.find((candidate) => candidate.id === selection.venueId);
    return venue?.organizationId ?? null;
  }

  return null;
}

export function resolveScopeVenueId(selection: ScopeSelection): string | null {
  return selection.type === "venue" ? selection.venueId : null;
}

export function describeScopeSelection(
  selection: ScopeSelection,
  organizations: ScopeOrganizationLike[],
  venues: ScopeVenueLike[],
): string {
  if (selection.type === "organization") {
    const organization = organizations.find((candidate) => candidate.id === selection.organizationId);
    return organization ? organization.name : "All Organizations";
  }

  if (selection.type === "venue") {
    const venue = venues.find((candidate) => candidate.id === selection.venueId);
    return venue ? venue.name : "All Organizations";
  }

  return "All Organizations";
}

function byName<T extends { name: string }>(a: T, b: T) {
  return a.name.localeCompare(b.name);
}

export function buildScopeSwitcherGroups(
  organizations: ScopeOrganizationLike[],
  venues: ScopeVenueLike[],
): ScopeSwitcherGroup[] {
  const groups: ScopeSwitcherGroup[] = [];

  for (const organization of [...organizations].sort(byName)) {
    const organizationVenues = venues
      .filter((venue) => venue.organizationId === organization.id)
      .sort(byName);

    groups.push({
      label: organization.name,
      options: [
        {
          value: serializeScopeValue({ type: "organization", organizationId: organization.id }),
          label: `${organization.name} (all venues)`,
        },
        ...organizationVenues.map((venue) => ({
          value: serializeScopeValue({ type: "venue", venueId: venue.id }),
          label: venue.name,
        })),
      ],
    });
  }

  const unlinkedVenues = venues.filter((venue) => !venue.organizationId).sort(byName);

  if (unlinkedVenues.length > 0) {
    groups.push({
      label: "Unlinked venues",
      options: unlinkedVenues.map((venue) => ({
        value: serializeScopeValue({ type: "venue", venueId: venue.id }),
        label: venue.name,
      })),
    });
  }

  return groups;
}
