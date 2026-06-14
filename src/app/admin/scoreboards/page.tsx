import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getFields } from "@/lib/services/fields";
import { getResources } from "@/lib/services/resources";
import {
  getScoreboardConnectionTypeLabel,
  getScoreboardIntegrationModeLabel,
  getScoreboardProfiles,
  getScoreboardStatusClass,
  getScoreboardStatusLabel,
} from "@/lib/services/scoreboards";
import { getVenues } from "@/lib/services/venues";

export const dynamic = "force-dynamic";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ScoreboardsPage() {
  const [profiles, venues, fields, resources] = await Promise.all([getScoreboardProfiles(), getVenues(), getFields(), getResources()]);
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const configuredCount = profiles.filter((profile) => profile.scoreboardStatus !== "not_configured").length;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Integrations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Scoreboards</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Prepare fields for manual, overlay, and future physical scoreboard integrations. No hardware commands are sent in v1.
          </p>
        </div>
        <Link href="/admin/scoreboards/new" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New scoreboard profile
        </Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Profiles</p>
          <p className="mt-2 text-3xl font-black">{profiles.length}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Configured</p>
          <p className="mt-2 text-3xl font-black">{configuredCount}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Manual Only</p>
          <p className="mt-2 text-3xl font-black">{profiles.filter((profile) => profile.integrationMode === "manual_only").length}</p>
        </article>
      </section>

      {profiles.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {profiles.map((profile) => {
            const field = fieldsById.get(profile.fieldId);
            const venue = venuesById.get(profile.venueId);
            const resource = profile.resourceId ? resourcesById.get(profile.resourceId) : null;

            return (
              <article key={profile.id} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getScoreboardStatusClass(profile.scoreboardStatus)}`}>
                        {getScoreboardStatusLabel(profile.scoreboardStatus)}
                      </span>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                        {getScoreboardIntegrationModeLabel(profile.integrationMode)}
                      </span>
                    </div>
                    <h2 className="mt-2 text-xl font-black">{field?.name ?? "Field unavailable"}</h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue?.name ?? "Venue unavailable"}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Hardware</p>
                        <p className="mt-1 text-sm font-black">{profile.manufacturer} · {profile.model}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Connection</p>
                        <p className="mt-1 text-sm font-black">{getScoreboardConnectionTypeLabel(profile.connectionType)}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Resource</p>
                        <p className="mt-1 text-sm font-black">{resource?.resourceName ?? "Not linked"}</p>
                      </div>
                    </div>
                    {profile.notes ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{profile.notes}</p> : null}
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(profile.updatedAt)}</p>
                  </div>
                  <Link href={`/admin/scoreboards/${profile.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No scoreboard profiles yet" message="Create a profile to document manual scoring, overlay readiness, or future scoreboard hardware for a field." actionHref="/admin/scoreboards/new" actionLabel="Create scoreboard profile" />
        </div>
      )}
    </section>
  );
}
