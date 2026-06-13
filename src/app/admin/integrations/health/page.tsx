import Link from "next/link";
import { getExternalSources, getExternalSourceStatusLabel, getExternalSourceTypeLabel } from "@/lib/services/external-sources";
import { getSessions } from "@/lib/services/sessions";
import type { ExternalSource, ExternalSourceStatus, Session } from "@/lib/types";
import { runTestSyncAction, updateExternalSourceHealthAction } from "./actions";

export const dynamic = "force-dynamic";

type IntegrationHealthPageProps = {
  searchParams?: Promise<{
    sync?: string;
  }>;
};

function formatDateTime(value: string | null) {
  if (!value) return "Never synced";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: ExternalSourceStatus) {
  if (status === "connected") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }
  if (status === "error") {
    return "bg-red-50 text-red-800";
  }
  if (status === "paused") {
    return "bg-amber-50 text-amber-900";
  }
  if (status === "not_configured") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-white text-[var(--muted)] ring-1 ring-[var(--line)]";
}

function latestSync(sources: ExternalSource[]) {
  const latest = sources
    .flatMap((source) => (source.lastSyncAt ? [source.lastSyncAt] : []))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return latest ?? null;
}

function countImportedSessions(source: ExternalSource, sessions: Session[]) {
  return sessions.filter((session) => (
    session.externalSource === source.sourceName
    || (Boolean(source.sourceUrl) && session.externalSourceUrl === source.sourceUrl)
  )).length;
}

function SummaryCard({ label, note, value }: { label: string; note: string; value: number | string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{note}</p>
    </article>
  );
}

export default async function IntegrationHealthPage({ searchParams }: IntegrationHealthPageProps) {
  const resolvedSearchParams = await searchParams;
  const [sources, sessions] = await Promise.all([getExternalSources(), getSessions()]);
  const activeSources = sources.filter((source) => source.sourceStatus === "connected");
  const errorSources = sources.filter((source) => source.sourceStatus === "error");

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Integrations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Integration health</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Monitor external schedule sources and run no-credential test sync checks for stored public URLs and feeds.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/integrations" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Sources
          </Link>
          <Link href="/admin/integrations/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            New source
          </Link>
        </div>
      </div>

      {resolvedSearchParams?.sync === "success" ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-bold text-green-800">Test sync completed.</p>
        </div>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Sources" note="Stored external sources" value={sources.length} />
        <SummaryCard label="Active Sources" note="Marked connected" value={activeSources.length} />
        <SummaryCard label="Error Sources" note="Needs attention" value={errorSources.length} />
        <SummaryCard label="Last Sync" note="Most recent test or import sync" value={formatDateTime(latestSync(sources))} />
      </section>

      <section className="mt-8 grid gap-4">
        {sources.length > 0 ? (
          sources.map((source) => {
            const importedCount = countImportedSessions(source, sessions);

            return (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={source.id}>
                <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em]">
                        {getExternalSourceTypeLabel(source.sourceType)}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(source.sourceStatus)}`}>
                        {getExternalSourceStatusLabel(source.sourceStatus)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-black">{source.sourceName}</h2>
                    {source.sourceUrl ? (
                      <p className="mt-3 break-all text-sm font-bold text-[var(--accent-strong)]">{source.sourceUrl}</p>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-[var(--muted)]">No source URL configured.</p>
                    )}
                    {source.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{source.notes}</p> : null}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Last sync time</p>
                        <p className="mt-1 text-sm font-black">{formatDateTime(source.lastSyncAt)}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Sessions imported</p>
                        <p className="mt-1 text-sm font-black">{importedCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:min-w-80 xl:grid-cols-1">
                    {[
                      ["connected", "Mark connected"],
                      ["error", "Mark error"],
                      ["paused", "Pause"],
                      ["connected", "Resume"],
                    ].map(([status, label]) => (
                      <form action={updateExternalSourceHealthAction} key={`${source.id}-${label}`}>
                        <input name="source_id" type="hidden" value={source.id} />
                        <input name="source_status" type="hidden" value={status} />
                        <button className="min-h-10 w-full rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" type="submit">
                          {label}
                        </button>
                      </form>
                    ))}
                    <form action={runTestSyncAction}>
                      <input name="source_id" type="hidden" value={source.id} />
                      <button className="min-h-10 w-full rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white" type="submit">
                        Run Test Sync
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-black">No external sources yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Create an integration source before monitoring health.
            </p>
            <Link href="/admin/integrations/new" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
              Create source
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
