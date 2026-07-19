import Link from "next/link";
import { getPublicAppUrl } from "@/lib/public-url";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessions } from "@/lib/services/sessions";
import { ScoreboardDisplayControls } from "./scoreboard-display-controls";

type ScoreboardDisplayControlsPageProps = {
  searchParams?: Promise<{
    field?: string;
    session?: string;
    venue?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ScoreboardDisplayControlsPage({ searchParams }: ScoreboardDisplayControlsPageProps) {
  const [scoped, allSessions, params] = await Promise.all([getScopedVenuesAndFields(), getSessions(), searchParams]);
  const { venues, fields } = scoped;
  const fieldIds = new Set(fields.map((field) => field.id));
  const sessions = allSessions.filter((session) => fieldIds.has(session.fieldId));

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/scoreboards" className="text-sm font-bold text-[var(--accent-strong)]">Back to scoreboards</Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Display controls</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Launch scoreboard display</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Select a venue, field, or session, choose display options, and launch a public scoreboard for phones, tablets, TVs, projectors, or OBS.
          </p>
        </div>
        <Link href="/admin/scoreboards/new" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
          New scoreboard profile
        </Link>
      </div>

      <ScoreboardDisplayControls
        appUrl={getPublicAppUrl()}
        fields={fields}
        initialFieldId={params?.field ?? ""}
        initialSessionId={params?.session ?? ""}
        initialVenueId={params?.venue ?? ""}
        sessions={sessions}
        venues={venues}
      />
    </section>
  );
}
