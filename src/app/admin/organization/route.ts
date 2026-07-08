import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { allOrganizationsScope, organizationScopeCookieName } from "@/lib/organization-scope";
import {
  normalizeScopeSelection,
  parseScopeValue,
  serializeScopeValue,
} from "@/lib/organization-scope-helpers";
import { getOrganizations } from "@/lib/services/organizations";
import { getScopeVenues } from "@/lib/services/venues";

export async function POST(request: Request) {
  const formData = await request.formData();
  const requestedScope = String(formData.get("organization_id") ?? allOrganizationsScope);
  const parsed = parseScopeValue(requestedScope);

  let nextScopeValue = allOrganizationsScope;

  if (parsed.type !== "all") {
    const [organizations, venues] = await Promise.all([
      getOrganizations().catch((error: unknown) => {
        console.error("Failed to load organizations for scope validation", error);
        return [];
      }),
      getScopeVenues().catch((error: unknown) => {
        console.error("Failed to load venues for scope validation", error);
        return [];
      }),
    ]);
    nextScopeValue = serializeScopeValue(normalizeScopeSelection(parsed, organizations, venues));
  }

  const cookieStore = await cookies();
  cookieStore.set(organizationScopeCookieName, nextScopeValue, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  const headerStore = await headers();
  const referer = headerStore.get("referer");
  redirect(referer ?? "/admin");
}
