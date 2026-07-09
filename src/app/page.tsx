import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/access/navigation";
import { resolveSession } from "@/lib/access/session";

export const dynamic = "force-dynamic";

// Root routes to the signed-in role's home. Guests go to the login wall and
// authenticated users with no role assignment land on the no-access screen.
export default async function Home() {
  const resolved = await resolveSession();
  if (resolved.kind === "active") {
    redirect(getRoleHome(resolved.context));
  }
  if (resolved.kind === "no-access") {
    redirect("/no-access");
  }
  redirect("/login");
}
