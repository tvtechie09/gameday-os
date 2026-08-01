import { redirect } from "next/navigation";
import { isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";

export const dynamic = "force-dynamic";

// Reuses the existing organization branding form as-is rather than
// duplicating it -- that page now has the scope guard it was missing, so
// this redirect is safe: it can only ever land the president on their own
// organization_id (ctx.scopeId), never one they type into a URL themselves.
export default async function OrgSettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !isOrgScoped(ctx) || !ctx.scopeId) {
    redirect(getRoleHome(ctx));
  }
  redirect(`/admin/organizations/${ctx.scopeId}/edit`);
}
