import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDemoClientOrganizations } from "@/lib/demo-client-mode";
import { allOrganizationsScope, organizationScopeCookieName } from "@/lib/organization-scope";
import { getOrganizations } from "@/lib/services/organizations";

export async function POST(request: Request) {
  const formData = await request.formData();
  const organizationId = String(formData.get("organization_id") ?? allOrganizationsScope);
  const organizations = await getOrganizations().catch((error: unknown) => {
    console.error("Failed to validate demo client organization scope", error);
    return [];
  });
  const allowedOrganizationIds = new Set(getDemoClientOrganizations(organizations).map((organization) => organization.id));
  const nextOrganizationScope = organizationId === allOrganizationsScope || allowedOrganizationIds.has(organizationId)
    ? organizationId
    : allOrganizationsScope;
  const cookieStore = await cookies();

  cookieStore.set(organizationScopeCookieName, nextOrganizationScope || allOrganizationsScope, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  const headerStore = await headers();
  const referer = headerStore.get("referer");
  redirect(referer ?? "/admin");
}
