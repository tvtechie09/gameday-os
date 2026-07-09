import { redirect } from "next/navigation";
import { buildNavigation } from "@/lib/access/navigation";
import { getImpersonatorContext, getSessionContext } from "@/lib/access/session";
import { AppShell } from "./app-shell";
import { ImpersonationBanner } from "./impersonation-banner";

// Server frame shared by role pages and the admin workspace. Resolves the
// session, builds capability-filtered navigation, and renders the persistent
// impersonation banner when a Platform Admin is impersonating a demo user.
export async function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/dev-login");
  }

  const [navGroups, impersonator] = await Promise.all([
    Promise.resolve(buildNavigation(ctx)),
    ctx.isImpersonating ? getImpersonatorContext() : Promise.resolve(null),
  ]);

  return (
    <>
      {ctx.isImpersonating && impersonator ? (
        <ImpersonationBanner roleLabel={ctx.roleLabel} email={ctx.email} />
      ) : null}
      <AppShell navGroups={navGroups} roleLabel={ctx.roleLabel} venueName={ctx.venueName} email={ctx.email}>
        {children}
      </AppShell>
    </>
  );
}
