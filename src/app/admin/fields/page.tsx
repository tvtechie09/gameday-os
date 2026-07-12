import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { revalidatePath } from "next/cache";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EmptyState } from "@/components/empty-state";
import { FieldQrCode } from "@/components/field-qr-code";
import { getPublicAppUrl, getPublicFieldUrl, publicAppUrlPointsToLocalhost } from "@/lib/public-url";
import { getFieldPageViewCountsByField } from "@/lib/services/field-page-views";
import { fieldStatuses, getFields, getFieldStatusClass, getFieldStatusLabel, readFieldStatus, updateFieldStatus } from "@/lib/services/fields";
import { getFollowCountsByField } from "@/lib/services/follows";
import { getVenues } from "@/lib/services/venues";
import type { Field, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function groupFieldsByVenue(fields: Field[], venues: Venue[]) {
  return venues
    .map((venue) => ({
      venue,
      fields: fields.filter((field) => field.venueId === venue.id),
    }))
    .filter((group) => group.fields.length > 0);
}

export default async function FieldsPage() {
  async function updateFieldStatusAction(formData: FormData) {
    "use server";

    const fieldId = String(formData.get("field_id") ?? "").trim();
    const status = readFieldStatus(String(formData.get("status") ?? "open"));

    if (!fieldId) {
      return;
    }

    try {
      await updateFieldStatus(fieldId, status);
      revalidatePath("/admin/fields");
      revalidatePath("/admin/dashboard");
      revalidatePath(`/fields/${fieldId}`);
    } catch (error) {
      console.error("Failed to update field status", error);
    }
  }

  let fields: Field[] = [];
  let venues: Venue[] = [];
  let fieldViewCounts = new Map<string, number>();
  let fieldFollowCounts = new Map<string, number>();
  let errorMessage: string | null = null;
  const appUrl = getPublicAppUrl();
  const publicUrlIsLocalhost = publicAppUrlPointsToLocalhost();

  try {
    const [fieldResults, venueResults, viewCounts, followCounts] = await Promise.all([getFields(), getVenues(), getFieldPageViewCountsByField(), getFollowCountsByField()]);
    fields = fieldResults;
    venues = venueResults;
    fieldViewCounts = new Map(viewCounts.map((summary) => [summary.fieldId, summary.views]));
    fieldFollowCounts = new Map(followCounts.map((summary) => [summary.fieldId, summary.follows]));
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load fields.");
  }

  const groupedFields = groupFieldsByVenue(fields, venues);
  const unassignedFields = fields.filter((field) => !venues.some((venue) => venue.id === field.venueId));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Fields</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Fields</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Every field with QR codes and status controls, grouped by venue.
          </p>
        </div>
        <Link href="/admin/fields/bookings" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
          Allocation &amp; permits
        </Link>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black">{field.name}</h3>
                          <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(field.status)}`}>
                            {getFieldStatusLabel(field.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{group.venue.name}</p>
                        <p className={field.mapX !== null && field.mapY !== null ? "mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]" : "mt-2 w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600"}>
                          {field.mapX !== null && field.mapY !== null ? "Map coordinates set" : "No map coordinates"}
                        </p>
                        <p className="mt-2 w-fit rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {fieldViewCounts.get(field.id) ?? 0} public views
                        </p>
                        <p className="mt-2 w-fit rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {fieldFollowCounts.get(field.id) ?? 0} follows
                        </p>
                        <div className="mt-3 rounded-lg bg-white p-3">
                          <p className="break-all text-sm font-semibold text-[var(--muted)]">{getPublicFieldUrl(field.id)}</p>
                          {publicUrlIsLocalhost ? (
                            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                              Warning: this public URL points to localhost. Set NEXT_PUBLIC_APP_URL before printing QR codes for field testing.
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <CopyLinkButton label="Copy public link" value={getPublicFieldUrl(field.id)} />
                          <CopyLinkButton label="Copy QR link" value={`${appUrl}/admin/fields/${field.id}/qr`} />
                          <Link href={`/admin/fields/${field.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                            QR Detail
                          </Link>
                          <Link href={`/admin/fields/${field.id}/control`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white">
                            Control
                          </Link>
                          <Link href={`/admin/fields/${field.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                            Edit
                          </Link>
                          <Link href={`/admin/fields/${field.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white">
                            Print QR
                          </Link>
                        </div>
                        <form action={updateFieldStatusAction} className="mt-4 grid gap-2 rounded-lg border border-[var(--line)] bg-white p-3 sm:grid-cols-[1fr_auto]">
                          <input name="field_id" type="hidden" value={field.id} />
                          <label className="grid gap-1">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Quick status</span>
                            <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={field.status} name="status">
                              {fieldStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {getFieldStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white sm:self-end" type="submit">
                            Update
                          </button>
                        </form>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(field.updatedAt)}</p>
                      </div>
                      <div className="grid gap-3">
                        <div className="w-fit rounded-lg border border-[var(--line)] bg-white p-3">
                          <FieldQrCode title={`${field.name} field QR code`} value={getPublicFieldUrl(field.id)} size={132} />
                        </div>
                        <div className="hidden rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-3 lg:block">
                          <div className="mx-auto h-[360px] w-[210px] overflow-hidden rounded-[1.5rem] border-4 border-white/15 bg-white shadow-sm">
                            <iframe className="h-full w-full border-0" src={`/fields/${field.id}`} title={`${field.name} mobile field preview`} />
                          </div>
                          <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/60">Mobile field preview</p>
                        </div>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black">{field.name}</h3>
                          <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(field.status)}`}>
                            {getFieldStatusLabel(field.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Unmatched venue</p>
                        <p className={field.mapX !== null && field.mapY !== null ? "mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]" : "mt-2 w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600"}>
                          {field.mapX !== null && field.mapY !== null ? "Map coordinates set" : "No map coordinates"}
                        </p>
                        <p className="mt-2 w-fit rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {fieldViewCounts.get(field.id) ?? 0} public views
                        </p>
                        <p className="mt-2 w-fit rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {fieldFollowCounts.get(field.id) ?? 0} follows
                        </p>
                        <div className="mt-3 rounded-lg bg-white p-3">
                          <p className="break-all text-sm font-semibold text-[var(--muted)]">{getPublicFieldUrl(field.id)}</p>
                          {publicUrlIsLocalhost ? (
                            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                              Warning: this public URL points to localhost. Set NEXT_PUBLIC_APP_URL before printing QR codes for field testing.
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <CopyLinkButton label="Copy public link" value={getPublicFieldUrl(field.id)} />
                          <CopyLinkButton label="Copy QR link" value={`${appUrl}/admin/fields/${field.id}/qr`} />
                          <Link href={`/admin/fields/${field.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                            Edit
                          </Link>
                          <Link href={`/admin/fields/${field.id}/control`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white">
                            Control
                          </Link>
                          <Link href={`/admin/fields/${field.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white">
                            Print QR
                          </Link>
                        </div>
                        <form action={updateFieldStatusAction} className="mt-4 grid gap-2 rounded-lg border border-[var(--line)] bg-white p-3 sm:grid-cols-[1fr_auto]">
                          <input name="field_id" type="hidden" value={field.id} />
                          <label className="grid gap-1">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Quick status</span>
                            <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={field.status} name="status">
                              {fieldStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {getFieldStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white sm:self-end" type="submit">
                            Update
                          </button>
                        </form>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(field.updatedAt)}</p>
                      </div>
                      <div className="grid gap-3">
                        <div className="w-fit rounded-lg border border-[var(--line)] bg-white p-3">
                          <FieldQrCode title={`${field.name} field QR code`} value={getPublicFieldUrl(field.id)} size={132} />
                        </div>
                        <div className="hidden rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-3 lg:block">
                          <div className="mx-auto h-[360px] w-[210px] overflow-hidden rounded-[1.5rem] border-4 border-white/15 bg-white shadow-sm">
                            <iframe className="h-full w-full border-0" src={`/fields/${field.id}`} title={`${field.name} mobile field preview`} />
                          </div>
                          <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/60">Mobile field preview</p>
                        </div>
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
            message="No fields yet. Add your first field."
            actionHref="/admin/fields/new"
            actionLabel="Add field"
          />
        </div>
      )}
    </section>
  );
}
