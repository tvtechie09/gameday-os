export const organizationScopeCookieName = "gameday_org_scope";
export const allOrganizationsScope = "all";

export async function getCurrentOrganizationScope(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const value = cookieStore.get(organizationScopeCookieName)?.value;
  return value && value !== allOrganizationsScope ? value : null;
}

export async function getWritableOrganizationId(): Promise<string | null> {
  const { getDefaultOrganizationId } = await import("@/lib/services/organizations");
  return getCurrentOrganizationScope() ?? getDefaultOrganizationId();
}
