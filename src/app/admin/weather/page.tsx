import Link from "next/link";
import { CloudSun } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { WeatherStatusCard } from "@/components/weather/weather-status-card";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getWeatherProfiles, getWeatherSourceLabel, getWeatherStatusClass, getWeatherStatusLabel } from "@/lib/services/weather-profiles";

export const dynamic = "force-dynamic";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function WeatherProfilesPage() {
  const [allProfiles, scoped] = await Promise.all([getWeatherProfiles(), getScopedVenuesAndFields()]);
  const venuesById = new Map(scoped.venues.map((venue) => [venue.id, venue]));
  // Isolate to the caller's venues: drop profiles for venues out of scope so a
  // venue-scoped admin never sees (or gets counts for) another venue's data.
  const profiles = allProfiles.filter((profile) => venuesById.has(profile.venueId));
  const monitoringCount = profiles.filter((profile) => profile.status === "monitoring").length;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Weather</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Weather profiles</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Set up venue weather awareness for game day operations. Weather profiles can now pull live provider data when coordinates and provider credentials are configured.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/operations-center" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--black-soft)] px-5 py-3 text-sm font-bold text-white">
            Venue Command Center
          </Link>
          <Link href="/admin/alerts/new?weather_delay=true" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-950">
            Create Weather Delay Alert
          </Link>
          <Link href="/admin/weather/new" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            New weather profile
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Profiles</p>
          <p className="mt-2 text-3xl font-black">{profiles.length}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Monitoring</p>
          <p className="mt-2 text-3xl font-black">{monitoringCount}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Weather API</p>
          <p className="mt-2 text-3xl font-black">Live</p>
        </article>
      </section>

      {profiles.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {profiles.map((profile) => {
            const venue = venuesById.get(profile.venueId);

            return (
              <article key={profile.id} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getWeatherStatusClass(profile.status)}`}>
                        {getWeatherStatusLabel(profile.status)}
                      </span>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                        {getWeatherSourceLabel(profile.weatherSource)}
                      </span>
                    </div>
                    <h2 className="mt-3 flex items-center gap-2 text-xl font-black">
                      <CloudSun className="h-5 w-5 text-[var(--accent-strong)]" aria-hidden="true" />
                      {profile.locationName}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue?.name ?? "Venue unavailable"}</p>
                    <div className="mt-4">
                      <WeatherStatusCard compact venueId={profile.venueId} />
                    </div>
                    {profile.notes ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{profile.notes}</p> : null}
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(profile.updatedAt)}</p>
                  </div>
                  <Link href={`/admin/weather/${profile.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No weather profiles yet" message="Create a venue weather profile to document manual game day weather checks." actionHref="/admin/weather/new" actionLabel="Create weather profile" />
        </div>
      )}
    </section>
  );
}
