import {
  allOrganizationsScope,
  normalizeScopeSelection,
  parseScopeValue,
  resolveScopeOrganizationId,
  resolveScopeVenueId,
  serializeScopeValue,
  type ScopeSelection,
} from "./organization-scope-helpers";

export { allOrganizationsScope };
export type { ScopeSelection };

export const organizationScopeCookieName = "gameday_org_scope";

type ResolvedScope = {
  selection: ScopeSelection;
  organizationId: string | null;
  venueId: string | null;
};

async function loadScopeContext() {
  const [{ getOrganizations }, { getScopeVenues }] = await Promise.all([
    import("@/lib/services/organizations"),
    import("@/lib/services/venues"),
  ]);
  const [organizations, venues] = await Promise.all([getOrganizations(), getScopeVenues()]);
  return { organizations, venues };
}

async function resolveScope(): Promise<ResolvedScope> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const parsed = parseScopeValue(cookieStore.get(organizationScopeCookieName)?.value);

  if (parsed.type === "all") {
    return { selection: parsed, organizationId: null, venueId: null };
  }

  try {
    const { organizations, venues } = await loadScopeContext();
    const selection = normalizeScopeSelection(parsed, organizations, venues);
    return {
      selection,
      organizationId: resolveScopeOrganizationId(selection, venues),
      venueId: resolveScopeVenueId(selection),
    };
  } catch (error) {
    console.error("Failed to validate organization scope", error);
    return { selection: { type: "all" }, organizationId: null, venueId: null };
  }
}

export async function getCurrentScopeSelection(): Promise<ScopeSelection> {
  return (await resolveScope()).selection;
}

export async function getCurrentScopeValue(): Promise<string> {
  return serializeScopeValue((await resolveScope()).selection);
}

export async function getCurrentOrganizationScope(): Promise<string | null> {
  return (await resolveScope()).organizationId;
}

export async function getCurrentVenueScope(): Promise<string | null> {
  return (await resolveScope()).venueId;
}

export async function getWritableOrganizationId(): Promise<string | null> {
  const { getDefaultOrganizationId } = await import("@/lib/services/organizations");
  return (await getCurrentOrganizationScope()) ?? getDefaultOrganizationId();
}
