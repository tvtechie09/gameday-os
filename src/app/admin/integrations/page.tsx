import Link from "next/link";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { IntegrationFrameworkConsole } from "./integration-framework-console";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { venues } = await getScopedVenuesAndFields();

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Admin-only</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Integration Framework</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
          Manage real provider connections, credential readiness, sync runs, webhooks, logs, and future connector mappings. Weather is registered as an existing working provider; SportsEngine is ready for OAuth credentials.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="ui-button ui-button-secondary min-h-11" href="/admin/integrations/daktronics">Daktronics Read-Only</Link>
          <Link className="ui-button ui-button-secondary min-h-11" href="/admin/integrations/sportsengine">SportsEngine</Link>
        </div>
      </section>

      <IntegrationFrameworkConsole defaultActorUserId={process.env.NEXT_PUBLIC_GAMEDAY_ADMIN_ACTOR_USER_ID ?? ""} venues={venues} />
    </main>
  );
}
