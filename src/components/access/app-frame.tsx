import { redirect } from "next/navigation";
import { buildNavigation } from "@/lib/access/navigation";
import { getImpersonatorContext, resolveSession } from "@/lib/access/session";
import { AppShell } from "./app-shell";
import { ImpersonationBanner } from "./impersonation-banner";

// Server frame shared by role pages and the admin workspace. Resolves the
// session, builds capability-filtered navigation, and renders the persistent
// impersonation banner when an admin is impersonating another user.
export async function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const resolved = await resolveSession();
  if (resolved.kind === "guest") {
    redirect("/login");
  }
  if (resolved.kind === "no-access") {
    redirect("/no-access");
  }
  const ctx = resolved.context;

  const [navGroups, impersonator] = await Promise.all([
    Promise.resolve(buildNavigation(ctx)),
    ctx.isImpersonating ? getImpersonatorContext() : Promise.resolve(null),
  ]);

  return (
    <>
      {ctx.isImpersonating && impersonator ? (
        <ImpersonationBanner roleLabel={ctx.roleLabel} venueName={ctx.venueName} adminEmail={impersonator.email} />
      ) : null}
      <AppShell navGroups={navGroups} roleLabel={ctx.roleLabel} venueName={ctx.venueName} email={ctx.email}>
        {children}
      </AppShell>
    </>
  );
}
