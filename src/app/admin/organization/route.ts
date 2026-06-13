import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { allOrganizationsScope, organizationScopeCookieName } from "@/lib/organization-scope";

export async function POST(request: Request) {
  const formData = await request.formData();
  const organizationId = String(formData.get("organization_id") ?? allOrganizationsScope);
  const cookieStore = await cookies();

  cookieStore.set(organizationScopeCookieName, organizationId || allOrganizationsScope, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  const headerStore = await headers();
  const referer = headerStore.get("referer");
  redirect(referer ?? "/admin");
}
