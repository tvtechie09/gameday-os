import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getVenues } from "@/lib/services/venues";
import type { Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  let venues: Venue[] = [];
  let errorMessage: string | null = null;

  try {
    venues = await getVenues();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load venues.";
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venues</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Venue roster</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Real venues from Supabase with live field counts from linked field records.
          </p>
        </div>
        <Link href="/admin/venues/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New venue
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load venues</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : venues.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {venues.map((venue) => (
            <article key={venue.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{venue.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue.description}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{venue.address}</p>
                </div>
                <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--accent-strong)]">{venue.status}</span>
              </div>
              <div className="mt-5 rounded-lg bg-[var(--background)] p-4">
                <p className="text-sm font-bold text-[var(--muted)]">Fields</p>
                <p className="mt-1 text-3xl font-black">{venue.fieldCount}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No venues yet"
            message="Create a venue to unlock fields, sessions, sponsor placements, and public QR pages."
            actionHref="/admin/venues/new"
            actionLabel="Create venue"
          />
        </div>
      )}
    </section>
  );
}
