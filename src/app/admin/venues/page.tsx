import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EmptyState } from "@/components/empty-state";
import { FieldQrCode } from "@/components/field-qr-code";
import { getPublicAppUrl, getPublicVenueUrl, publicAppUrlPointsToLocalhost } from "@/lib/public-url";
import { getVenues } from "@/lib/services/venues";
import { getSessionContext } from "@/lib/access/session";
import { managesAllVenues, venueInScope } from "@/lib/access/capabilities";
import type { Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function VenuesPage() {
  let venues: Venue[] = [];
  let errorMessage: string | null = null;
  const appUrl = getPublicAppUrl();
  const publicUrlIsLocalhost = publicAppUrlPointsToLocalhost();
  const ctx = await getSessionContext();
  const canManageAll = managesAllVenues(ctx);

  try {
    venues = await getVenues();
    // Venue-scoped roles (director, tech manager) manage only their own venue.
    if (!canManageAll) {
      venues = venues.filter((venue) => venueInScope(ctx, venue));
    }
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load venues.");
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venues</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Venue roster</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Every venue with live field counts from linked field records.
          </p>
        </div>
        {canManageAll ? (
          <Link href="/admin/venues/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            New venue
          </Link>
        ) : null}
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
              <div className="mt-4 overflow-x-auto rounded-lg bg-[var(--background)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Public venue URL</p>
                <code className="mt-2 block whitespace-nowrap text-sm font-bold text-[var(--foreground)]">{getPublicVenueUrl(venue.id)}</code>
                {publicUrlIsLocalhost ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                    Warning: this public URL points to localhost. Set NEXT_PUBLIC_APP_URL before printing QR codes for field testing.
                  </p>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[auto_1fr]">
                <div className="w-fit rounded-lg border border-[var(--line)] bg-white p-3">
                  <FieldQrCode title={`${venue.name} venue QR code`} value={getPublicVenueUrl(venue.id)} size={132} />
                </div>
                <div className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-3">
                  <div className="mx-auto h-[360px] max-w-[210px] overflow-hidden rounded-[1.5rem] border-4 border-white/15 bg-white shadow-sm">
                    <iframe className="h-full w-full border-0" src={`/venues/${venue.id}`} title={`${venue.name} mobile venue preview`} />
                  </div>
                  <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/60">Mobile venue preview</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(venue.updatedAt)}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <CopyLinkButton label="Copy public link" value={getPublicVenueUrl(venue.id)} />
                  <CopyLinkButton label="Copy QR link" value={`${appUrl}/admin/venues/${venue.id}/qr`} />
                  <Link href={`/venues/${venue.id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white">
                    Public Page
                  </Link>
                  <Link href={`/admin/venues/${venue.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Print Venue QR
                  </Link>
                  <Link href={`/admin/venues/${venue.id}/mode`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Venue Mode
                  </Link>
                  <Link href={`/admin/venues/${venue.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Edit
                  </Link>
                </div>
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
