import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getFields } from "@/lib/services/fields";
import {
  getScoreboardAdapters,
  getScoreboardAdapterStatusClass,
  getScoreboardAdapterStatusLabel,
  getScoreboardAdapterTypeLabel,
  scoreboardAdapterTypes,
} from "@/lib/services/scoreboard-adapters";
import { getScoreboardProfiles } from "@/lib/services/scoreboards";
import { getVenues } from "@/lib/services/venues";
import { createScoreboardAdapterFormAction } from "./actions";
import { AdapterTestButton } from "./adapter-test-button";

export const dynamic = "force-dynamic";

function formatSyncTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ScoreboardAdaptersPage() {
  const [adapters, profiles, venues, fields] = await Promise.all([
    getScoreboardAdapters(),
    getScoreboardProfiles(),
    getVenues(),
    getFields(),
  ]);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/scoreboards" className="text-sm font-bold text-[var(--accent-strong)]">Back to scoreboards</Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Scoreboard Adapter Framework</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Scoreboard adapters</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Vendor-neutral driver records for manual, Daktronics, Nevco, Fair-Play, Musco, and custom integrations. Test mode updates adapter metadata only.
          </p>
        </div>
        <Link href="/admin/scoreboards/new" className="ui-button ui-button-secondary">
          New scoreboard profile
        </Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="ui-card p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Adapters</p>
          <p className="mt-2 text-3xl font-black">{adapters.length}</p>
        </article>
        <article className="ui-card p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Active</p>
          <p className="mt-2 text-3xl font-black">{adapters.filter((adapter) => adapter.adapterStatus === "active").length}</p>
        </article>
        <article className="ui-card p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Testing</p>
          <p className="mt-2 text-3xl font-black">{adapters.filter((adapter) => adapter.adapterStatus === "testing").length}</p>
        </article>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Add adapter record</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Store a vendor-neutral adapter profile. This does not connect to hardware.
        </p>
        <form action={createScoreboardAdapterFormAction} className="mt-5 grid gap-4 lg:grid-cols-[1fr_180px_1fr_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Scoreboard</span>
            <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="scoreboard_id" required>
              <option value="">Select scoreboard profile</option>
              {profiles.map((profile) => {
                const venue = venuesById.get(profile.venueId);
                const field = fieldsById.get(profile.fieldId);

                return (
                  <option key={profile.id} value={profile.id}>
                    {venue?.name ?? "Venue"} · {field?.name ?? "Field"} · {profile.manufacturer}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Adapter type</span>
            <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue="manual" name="adapter_type" required>
              {scoreboardAdapterTypes.map((type) => (
                <option key={type} value={type}>{getScoreboardAdapterTypeLabel(type)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Notes</span>
            <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="notes" placeholder="Driver notes, vendor info, future bridge details" />
          </label>
          <button className="ui-button ui-button-primary min-h-12" type="submit">
            Add Adapter
          </button>
        </form>
      </section>

      {adapters.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {adapters.map((adapter) => {
            const profile = profilesById.get(adapter.scoreboardId);
            const venue = profile ? venuesById.get(profile.venueId) : null;
            const field = profile ? fieldsById.get(profile.fieldId) : null;

            return (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm" key={adapter.id}>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getScoreboardAdapterStatusClass(adapter.adapterStatus)}`}>
                        {getScoreboardAdapterStatusLabel(adapter.adapterStatus)}
                      </span>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                        {getScoreboardAdapterTypeLabel(adapter.adapterType)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-black">{getScoreboardAdapterTypeLabel(adapter.adapterType)} Adapter</h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {venue?.name ?? "Venue unavailable"} · {field?.name ?? "Field unavailable"}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Scoreboard</p>
                        <p className="mt-1 text-sm font-black">{profile ? `${profile.manufacturer} · ${profile.model}` : "Profile unavailable"}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Last Sync</p>
                        <p className="mt-1 text-sm font-black">{formatSyncTime(adapter.lastSyncAt)}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Mode</p>
                        <p className="mt-1 text-sm font-black">No hardware commands</p>
                      </div>
                    </div>
                    {adapter.notes ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{adapter.notes}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <AdapterTestButton adapterId={adapter.id} />
                    {profile ? (
                      <Link className="ui-button ui-button-secondary min-h-11 px-4 py-2 text-sm" href={`/admin/scoreboards/${profile.id}/edit`}>
                        Edit Scoreboard
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No scoreboard adapters yet" message="Create an adapter record to prepare vendor-neutral driver workflows. No hardware commands are sent." actionHref="/admin/scoreboards" actionLabel="Open scoreboards" />
        </div>
      )}
    </section>
  );
}
