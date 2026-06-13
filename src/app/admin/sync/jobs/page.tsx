import { getSyncJobs, getSyncStatusLabel } from "@/lib/services/sync-engine";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "completed") return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  if (status === "failed") return "bg-red-100 text-red-900 ring-1 ring-red-200";
  if (status === "running") return "bg-blue-50 text-blue-800 ring-1 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export default async function SyncJobsPage() {
  const jobs = await getSyncJobs();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sync Engine</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Sync jobs</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Track external source runs and import counts across CSV, iCal, SportsEngine, HomeTeamsOnline, and future adapters.
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        {jobs.length > 0 ? jobs.map((job) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={job.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(job.status)}`}>
                  {getSyncStatusLabel(job.status)}
                </span>
                <h2 className="mt-3 text-xl font-black">{job.sourceType}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Created {formatDateTime(job.createdAt)} · Completed {formatDateTime(job.completedAt)}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:min-w-80">
                <div className="rounded-lg bg-[var(--background)] p-3"><p className="text-xs font-bold text-[var(--muted)]">Found</p><p className="mt-1 text-2xl font-black">{job.recordsFound}</p></div>
                <div className="rounded-lg bg-green-50 p-3"><p className="text-xs font-bold text-green-700">Imported</p><p className="mt-1 text-2xl font-black text-green-950">{job.recordsImported}</p></div>
                <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">Skipped</p><p className="mt-1 text-2xl font-black text-amber-950">{job.recordsSkipped}</p></div>
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-black">No sync jobs yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Run a CSV or calendar import to create the first sync job.</p>
          </div>
        )}
      </div>
    </section>
  );
}
