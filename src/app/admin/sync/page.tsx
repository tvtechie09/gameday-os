import Link from "next/link";
import { getSyncDashboardStats, getSyncJobs, getSyncQueueItems } from "@/lib/services/sync-engine";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SummaryCard({ label, note, value }: { label: string; note: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
    </article>
  );
}

export default async function SyncOverviewPage() {
  const [stats, jobs, queueItems] = await Promise.all([getSyncDashboardStats(), getSyncJobs(), getSyncQueueItems("all")]);
  const recentJobs = jobs.slice(0, 5);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sync Engine</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">External data workflow</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Stage external schedule records, review them, and approve imports before sessions are created.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/sync/review" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            Review Queue
          </Link>
          <Link href="/admin/sync/jobs" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Sync Jobs
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Last Sync" note="Most recent completed sync job." value={formatDateTime(stats.lastSync)} />
        <SummaryCard label="Pending Review Items" note="Records waiting for approval." value={stats.pendingReviewItems} />
        <SummaryCard label="Failed Sync Jobs" note="Jobs that need attention." value={stats.failedJobs} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Recent jobs</h2>
          <div className="mt-4 grid gap-3">
            {recentJobs.length > 0 ? recentJobs.map((job) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={job.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{job.sourceType}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{formatDateTime(job.createdAt)}</p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em]">{job.status}</span>
                </div>
              </article>
            )) : <p className="text-sm leading-6 text-[var(--muted)]">No sync jobs yet.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Queue snapshot</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["pending", "approved", "rejected", "imported"].map((status) => (
              <div className="rounded-lg bg-[var(--background)] p-4" key={status}>
                <p className="text-sm font-bold capitalize text-[var(--muted)]">{status}</p>
                <p className="mt-1 text-3xl font-black">{queueItems.filter((item) => item.reviewStatus === status).length}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
