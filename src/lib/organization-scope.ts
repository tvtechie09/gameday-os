export const organizationScopeCookieName = "gameday_org_scope";
export const allOrganizationsScope = "all";

export async function getCurrentOrganizationScope(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const value = cookieStore.get(organizationScopeCookieName)?.value;

  if (!value || value === allOrganizationsScope) {
    return null;
  }

  try {
    const [{ getDemoClientOrganizations }, { getOrganizations }] = await Promise.all([
      import("@/lib/demo-client-mode"),
      import("@/lib/services/organizations"),
    ]);
    const organizations = await getOrganizations();
    const allowedOrganizationIds = new Set(getDemoClientOrganizations(organizations).map((organization) => organization.id));
    return allowedOrganizationIds.has(value) ? value : null;
  } catch (error) {
    console.error("Failed to validate organization scope", error);
    return null;
  }
}

export async function getWritableOrganizationId(): Promise<string | null> {
  const { getDefaultOrganizationId } = await import("@/lib/services/organizations");
  return getCurrentOrganizationScope() ?? getDefaultOrganizationId();
}
