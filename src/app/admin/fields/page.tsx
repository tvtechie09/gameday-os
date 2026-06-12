import Link from "next/link";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EmptyState } from "@/components/empty-state";
import { FieldQrCode } from "@/components/field-qr-code";
import { getPublicFieldUrl } from "@/lib/public-url";
import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import type { Field, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

function groupFieldsByVenue(fields: Field[], venues: Venue[]) {
  return venues
    .map((venue) => ({
      venue,
      fields: fields.filter((field) => field.venueId === venue.id),
    }))
    .filter((group) => group.fields.length > 0);
}

export default async function FieldsPage() {
  let fields: Field[] = [];
  let venues: Venue[] = [];
  let errorMessage: string | null = null;

  try {
    [fields, venues] = await Promise.all([getFields(), getVenues()]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load fields.";
  }

  const groupedFields = groupFieldsByVenue(fields, venues);
  const unassignedFields = fields.filter((field) => !venues.some((venue) => venue.id === field.venueId));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Fields</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Field list</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Real fields from Supabase, grouped by their venue.
          </p>
        </div>
        <Link href="/admin/fields/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New field
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load fields</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : fields.length > 0 ? (
        <div className="mt-8 grid gap-5">
          {groupedFields.map((group) => (
            <section key={group.venue.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
              <div className="flex flex-col gap-1 border-b border-[var(--line)] pb-4">
                <h2 className="text-xl font-black">{group.venue.name}</h2>
                <p className="text-sm font-semibold text-[var(--muted)]">{group.venue.address}</p>
              </div>
              <div className="mt-4 grid gap-3">
                {group.fields.map((field) => (
                  <article key={field.id} className="rounded-lg bg-[var(--background)] p-4">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                      <div className="min-w-0">
                        <h3 className="text-lg font-black">{field.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{group.venue.name}</p>
                        <p className="mt-3 break-all rounded-lg bg-white p-3 text-sm font-semibold text-[var(--muted)]">{getPublicFieldUrl(field.id)}</p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <CopyLinkButton value={getPublicFieldUrl(field.id)} />
                          <Link href={field.qrPath} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                            View public page
                          </Link>
                          <Link href={`/admin/fields/${field.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white">
                            Print QR
                          </Link>
                        </div>
                      </div>
                      <div className="w-fit rounded-lg border border-[var(--line)] bg-white p-3">
                        <FieldQrCode value={getPublicFieldUrl(field.id)} size={132} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {unassignedFields.length > 0 ? (
            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-xl font-black">Unmatched venue</h2>
              <div className="mt-4 grid gap-3">
                {unassignedFields.map((field) => (
                  <article key={field.id} className="rounded-lg bg-[var(--background)] p-4">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                      <div className="min-w-0">
                        <h3 className="text-lg font-black">{field.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Unmatched venue</p>
                        <p className="mt-3 break-all rounded-lg bg-white p-3 text-sm font-semibold text-[var(--muted)]">{getPublicFieldUrl(field.id)}</p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <CopyLinkButton value={getPublicFieldUrl(field.id)} />
                          <Link href={`/admin/fields/${field.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white">
                            Print QR
                          </Link>
                        </div>
                      </div>
                      <div className="w-fit rounded-lg border border-[var(--line)] bg-white p-3">
                        <FieldQrCode value={getPublicFieldUrl(field.id)} size={132} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No fields yet"
            message="Create a field and assign it to a Supabase venue to start building QR-accessible field pages."
            actionHref="/admin/fields/new"
            actionLabel="Create field"
          />
        </div>
      )}
    </section>
  );
}
