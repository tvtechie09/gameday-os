import Link from "next/link";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSyncJobs, getSyncQueueItems, getSyncStatusLabel, syncQueueReviewStatuses } from "@/lib/services/sync-engine";
import type { Field, SyncQueueReviewStatus, Venue } from "@/lib/types";
import { approveSyncQueueItemAction, importSyncQueueItemAction, rejectSyncQueueItemAction } from "../actions";

export const dynamic = "force-dynamic";

type SyncReviewPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

function readStatus(value: string | undefined): SyncQueueReviewStatus | "all" {
  return syncQueueReviewStatuses.find((status) => status === value) ?? "pending";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSessionPreview(sourceData: unknown) {
  if (!isRecord(sourceData) || !isRecord(sourceData.session)) {
    return {
      awayTeam: "TBD",
      fieldId: null,
      homeTeam: "TBD",
      startTime: null,
      title: "Unsupported record",
    };
  }

  const session = sourceData.session;
  return {
    awayTeam: typeof session.away_team === "string" ? session.away_team : "TBD",
    fieldId: typeof session.field_id === "string" ? session.field_id : null,
    homeTeam: typeof session.home_team === "string" ? session.home_team : "TBD",
    startTime: typeof session.start_time === "string" ? session.start_time : null,
    title: typeof session.title === "string" ? session.title : "Untitled session",
  };
}

function getSourceMetadata(sourceData: unknown) {
  if (!isRecord(sourceData) || !isRecord(sourceData.source)) {
    return {
      fieldName: null,
      location: null,
      provider: null,
      raw: null,
      sourceUrl: null,
      venueName: null,
    };
  }

  const source = sourceData.source;
  return {
    fieldName: typeof source.field_name === "string" ? source.field_name : null,
    location: typeof source.location === "string" ? source.location : null,
    provider: typeof source.provider === "string" ? source.provider : null,
    raw: isRecord(source.raw) ? source.raw : null,
    sourceUrl: typeof source.source_url === "string" ? source.source_url : null,
    venueName: typeof source.venue_name === "string" ? source.venue_name : null,
  };
}

function getProposedSession(sourceData: unknown) {
  if (!isRecord(sourceData) || !isRecord(sourceData.session)) {
    return {
      endTime: null,
      externalSource: null,
      externalSourceId: null,
      externalSourceUrl: null,
      sportType: null,
      status: null,
    };
  }

  const session = sourceData.session;
  return {
    endTime: typeof session.end_time === "string" ? session.end_time : null,
    externalSource: typeof session.external_source === "string" ? session.external_source : null,
    externalSourceId: typeof session.external_source_id === "string" ? session.external_source_id : null,
    externalSourceUrl: typeof session.external_source_url === "string" ? session.external_source_url : null,
    sportType: typeof session.sport_type === "string" ? session.sport_type : null,
    status: typeof session.status === "string" ? session.status : null,
  };
}

function getFieldMatch(fieldId: string | null, fieldsById: Map<string, Field>) {
  return fieldId ? fieldsById.get(fieldId) ?? null : null;
}

function getVenueMatch(field: Field | null, venuesById: Map<string, Venue>) {
  return field ? venuesById.get(field.venueId) ?? null : null;
}

function formatDateTime(value: string | null) {
  if (!value) return "No start time";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: SyncQueueReviewStatus) {
  if (status === "imported") return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  if (status === "approved") return "bg-blue-50 text-blue-800 ring-1 ring-blue-200";
  if (status === "rejected") return "bg-red-100 text-red-900 ring-1 ring-red-200";
  return "bg-amber-100 text-amber-950 ring-1 ring-amber-200";
}

function matchClass(hasMatch: boolean) {
  return hasMatch
    ? "bg-green-50 text-green-800 ring-1 ring-green-200"
    : "bg-red-50 text-red-800 ring-1 ring-red-200";
}

function formatRawData(raw: Record<string, unknown> | null) {
  if (!raw) return "No raw source data stored for this record.";
  return JSON.stringify(raw, null, 2);
}

function QueueActionButton({ action, disabled, id, label, primary = false }: { action: (formData: FormData) => Promise<void>; disabled?: boolean; id: string; label: string; primary?: boolean }) {
  return (
    <form action={action}>
      <input name="id" type="hidden" value={id} />
      <button
        className={`min-h-10 rounded-lg px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${primary ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white"}`}
        disabled={disabled}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

export default async function SyncReviewPage({ searchParams }: SyncReviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedStatus = readStatus(resolvedSearchParams?.status);
  // /admin/sync is platform-admin-only (route guard), so the scoped helper
  // returns every venue here; it satisfies the tenant-isolation guard and stays
  // correct if the route ever opens to venue-scoped roles.
  const [queueItems, jobs, scoped] = await Promise.all([getSyncQueueItems(selectedStatus), getSyncJobs(), getScopedVenuesAndFields()]);
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const fieldsById = new Map(scoped.fields.map((field) => [field.id, field]));
  const venuesById = new Map(scoped.venues.map((venue) => [venue.id, venue]));

  const filterItems: Array<{ href: string; label: string; value: SyncQueueReviewStatus | "all" }> = [
    { href: "/admin/sync/review?status=all", label: "All", value: "all" },
    ...syncQueueReviewStatuses.map((status) => ({
      href: `/admin/sync/review?status=${status}`,
      label: getSyncStatusLabel(status),
      value: status,
    })),
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sync Review</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Review external records</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Approve, reject, or import staged records before they become GameDay OS sessions.
          </p>
        </div>
        <Link href="/admin/sync/jobs" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
          View Jobs
        </Link>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filterItems.map((item) => {
          const active = selectedStatus === item.value;
          return (
            <Link className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${active ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"}`} href={item.href} key={item.value}>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4">
        {queueItems.length > 0 ? queueItems.map((item) => {
          const preview = getSessionPreview(item.sourceData);
          const proposedSession = getProposedSession(item.sourceData);
          const sourceMetadata = getSourceMetadata(item.sourceData);
          const fieldMatch = getFieldMatch(preview.fieldId, fieldsById);
          const venueMatch = getVenueMatch(fieldMatch, venuesById);
          const job = jobsById.get(item.syncJobId);

          return (
            <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={item.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(item.reviewStatus)}`}>
                      {getSyncStatusLabel(item.reviewStatus)}
                    </span>
                    {job ? <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{job.sourceType}</span> : null}
                  </div>
                  <h2 className="mt-3 text-xl font-black">{preview.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{preview.homeTeam} vs. {preview.awayTeam}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{formatDateTime(preview.startTime)}</p>
                  <p className="mt-2 break-all text-xs font-bold text-[var(--muted)]">Source record: {item.sourceRecordId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <QueueActionButton action={approveSyncQueueItemAction} disabled={item.reviewStatus === "approved" || item.reviewStatus === "imported"} id={item.id} label="Approve" />
                  <QueueActionButton action={rejectSyncQueueItemAction} disabled={item.reviewStatus === "rejected" || item.reviewStatus === "imported"} id={item.id} label="Reject" />
                  <QueueActionButton action={importSyncQueueItemAction} disabled={item.reviewStatus === "rejected" || item.reviewStatus === "imported"} id={item.id} label="Import" primary />
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg bg-[var(--background)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em]">Source Data</h3>
                    {sourceMetadata.provider ? <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-[var(--muted)]">{sourceMetadata.provider}</span> : null}
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div><dt className="font-bold text-[var(--muted)]">Source URL</dt><dd className="break-all font-semibold">{sourceMetadata.sourceUrl ?? proposedSession.externalSourceUrl ?? "Not provided"}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">Source venue</dt><dd className="font-semibold">{sourceMetadata.venueName ?? "Not provided"}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">Source field/location</dt><dd className="font-semibold">{sourceMetadata.fieldName ?? sourceMetadata.location ?? "Not provided"}</dd></div>
                  </dl>
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-white p-3 text-xs leading-5 text-[var(--muted)]">{formatRawData(sourceMetadata.raw)}</pre>
                </section>

                <section className="rounded-lg bg-[var(--background)] p-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em]">Proposed Session</h3>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div><dt className="font-bold text-[var(--muted)]">Title</dt><dd className="font-semibold">{preview.title}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">Teams</dt><dd className="font-semibold">{preview.homeTeam} vs. {preview.awayTeam}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">Start</dt><dd className="font-semibold">{formatDateTime(preview.startTime)}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">End</dt><dd className="font-semibold">{formatDateTime(proposedSession.endTime)}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">Sport / Status</dt><dd className="font-semibold capitalize">{proposedSession.sportType ?? "baseball"} · {proposedSession.status ?? "scheduled"}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">External Tracking</dt><dd className="break-all font-semibold">{proposedSession.externalSource ?? "external"} · {proposedSession.externalSourceId ?? "No ID"}</dd></div>
                  </dl>
                </section>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--line)] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em]">Venue Match</h3>
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${matchClass(Boolean(venueMatch))}`}>{venueMatch ? "Matched" : "Missing"}</span>
                  </div>
                  <p className="mt-3 text-lg font-black">{venueMatch?.name ?? "No venue match"}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Source venue: {sourceMetadata.venueName ?? "Not provided"}</p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em]">Field Match</h3>
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${matchClass(Boolean(fieldMatch))}`}>{fieldMatch ? "Matched" : "Missing"}</span>
                  </div>
                  <p className="mt-3 text-lg font-black">{fieldMatch?.name ?? "No field match"}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Source field: {sourceMetadata.fieldName ?? sourceMetadata.location ?? "Not provided"}</p>
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-black">No records to review</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Run a CSV, iCal, SportsEngine, or HomeTeamsOnline import to stage records here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
