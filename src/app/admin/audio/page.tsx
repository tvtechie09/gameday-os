import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getAudioModeLabel, getAudioProfiles, getAudioStatusClass, getAudioStatusLabel } from "@/lib/services/audio-profiles";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessions } from "@/lib/services/sessions";

export const dynamic = "force-dynamic";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AudioProfilesPage() {
  const [allProfiles, scoped, sessions] = await Promise.all([getAudioProfiles(), getScopedVenuesAndFields(), getSessions()]);
  const venuesById = new Map(scoped.venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(scoped.fields.map((field) => [field.id, field]));
  // Isolate to the caller's venues (no-op for platform/org admins).
  const profiles = allProfiles.filter((profile) => venuesById.has(profile.venueId));
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const activeCount = profiles.filter((profile) => profile.status === "active").length;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Audio</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Audio profiles</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Prepare walk-up music and field audio workflows without playback, streaming, or copyrighted music handling.
          </p>
        </div>
        <Link href="/admin/audio/new" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New audio profile
        </Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Profiles</p>
          <p className="mt-2 text-3xl font-black">{profiles.length}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Active</p>
          <p className="mt-2 text-3xl font-black">{activeCount}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Field-level</p>
          <p className="mt-2 text-3xl font-black">{profiles.filter((profile) => !profile.sessionId).length}</p>
        </article>
      </section>

      {profiles.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {profiles.map((profile) => {
            const field = fieldsById.get(profile.fieldId);
            const venue = venuesById.get(profile.venueId);
            const session = profile.sessionId ? sessionsById.get(profile.sessionId) : null;

            return (
              <article key={profile.id} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getAudioStatusClass(profile.status)}`}>
                        {getAudioStatusLabel(profile.status)}
                      </span>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                        {getAudioModeLabel(profile.audioMode)}
                      </span>
                    </div>
                    <h2 className="mt-2 text-xl font-black">{field?.name ?? "Field unavailable"}</h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue?.name ?? "Venue unavailable"}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Session</p>
                        <p className="mt-1 text-sm font-black">{session?.title ?? "Field-level"}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Speaker</p>
                        <p className="mt-1 text-sm font-black">{profile.speakerType ?? "Not documented"}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Provider</p>
                        <p className="mt-1 text-sm font-black">{profile.provider ?? "Not assigned"}</p>
                      </div>
                    </div>
                    {profile.notes ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{profile.notes}</p> : null}
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(profile.updatedAt)}</p>
                  </div>
                  <Link href={`/admin/audio/${profile.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No audio profiles yet" message="Create an audio profile to document field-level or session-level audio readiness." actionHref="/admin/audio/new" actionLabel="Create audio profile" />
        </div>
      )}
    </section>
  );
}
