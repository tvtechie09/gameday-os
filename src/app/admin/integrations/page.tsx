import Link from "next/link";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getExternalSources } from "@/lib/services/external-sources";
import { getSessions } from "@/lib/services/sessions";
import { getSyncJobs, getSyncQueueItems } from "@/lib/services/sync-engine";
import { CalendarImportAdapter } from "./calendar-import-adapter";
import { IntegrationFrameworkConsole } from "./integration-framework-console";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const [{ venues, fields }, sessions, sources, syncJobs, queueItems] = await Promise.all([
    getScopedVenuesAndFields(),
    getSessions(),
    getExternalSources(),
    getSyncJobs(),
    getSyncQueueItems("all"),
  ]);

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

      {/* Mounted 2026-08-11. This adapter, its server actions and its field
          matching were all complete and rendered NOWHERE — the page imported
          only the framework console. It is the no-credentials path onto a
          SportsEngine schedule: paste the feed URL their admin already has
          (the same one behind "Sync Schedule" in a SportsEngine account),
          match each event to a field, import. Nothing to approve, nothing
          secret to hold, revocable by rotating the URL. */}
      <section className="mt-5 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Schedule import</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Bring your own schedule</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
          Import from a calendar feed or a CSV export — SportsEngine, TeamSnap, LeagueApps, or anything
          that publishes a feed. No credentials required. Every event is matched to a field before it
          is imported, and re-importing the same feed updates rather than duplicates.
        </p>
      </section>
      <CalendarImportAdapter fields={fields} pendingReviewCount={queueItems.filter((item) => item.reviewStatus === "pending" || item.reviewStatus === "approved").length} sessions={sessions} sources={sources} syncJobs={syncJobs} venues={venues} />

      <IntegrationFrameworkConsole defaultActorUserId={process.env.NEXT_PUBLIC_GAMEDAY_ADMIN_ACTOR_USER_ID ?? ""} venues={venues} />
    </main>
  );
}
