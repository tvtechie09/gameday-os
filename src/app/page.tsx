import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext, isDevLoginEnabled } from "@/lib/access/session";

export const dynamic = "force-dynamic";

// Root routes to the signed-in role's home. No session -> dev-login (non-prod)
// so every entry point flows through the role-based experiences.
export default async function Home() {
  const ctx = await getSessionContext();
  if (ctx) {
    redirect(getRoleHome(ctx));
  }
  redirect(isDevLoginEnabled() ? "/dev-login" : "/today");
}
