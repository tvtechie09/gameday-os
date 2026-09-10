import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { MfaPanel } from "@/components/auth/mfa-panel";
import { defaultVenueNotificationPreferences } from "@/lib/notification-preferences-core";
import { getVenueNotificationPreferences } from "@/lib/services/notification-preferences";
import { recordPilotEvent } from "@/lib/services/pilot-telemetry";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export const dynamic = "force-dynamic";

// Your own account. Every signed-in admin reaches this -- it only ever acts on
// the caller's own Supabase user, so the guard is just "are you signed in".
export default async function AccountPage() {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect(getRoleHome(ctx));
  }
  const preferences = ctx.venueId
    ? await getVenueNotificationPreferences(ctx).catch(() => defaultVenueNotificationPreferences(ctx.roleKey))
    : null;
  if (preferences) void recordPilotEvent(ctx, "notification_preferences_opened");

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Account</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Your account</h1>
      <p className="mt-3 text-base leading-7 text-[var(--muted)]">
        {ctx.displayName} · {ctx.email} · {ctx.roleLabel}
      </p>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Two-factor authentication</h2>
        <div className="mt-4">
          <MfaPanel />
        </div>
      </section>

      {preferences ? (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Notifications</p>
          <h2 className="mt-1 text-xl font-black">What reaches your event inbox</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            These choices apply only to you at {ctx.venueName ?? "this venue"}. They do not change operational announcements or another person&apos;s settings.
          </p>
          <NotificationPreferencesForm canSave={Boolean(ctx.authUserId)} preferences={preferences} />
        </section>
      ) : null}
    </section>
  );
}
