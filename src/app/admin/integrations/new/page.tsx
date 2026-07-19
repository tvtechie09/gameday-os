import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createExternalSource, externalSourceStatuses, externalSourceTypes, getExternalSourceStatusLabel, getExternalSourceTypeLabel } from "@/lib/services/external-sources";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import type { ExternalSourceStatus, ExternalSourceType } from "@/lib/types";

export const dynamic = "force-dynamic";

function readSourceType(value: FormDataEntryValue | null): ExternalSourceType {
  const rawValue = String(value ?? "");
  return externalSourceTypes.find((type) => type === rawValue) ?? "other";
}

function readSourceStatus(value: FormDataEntryValue | null): ExternalSourceStatus {
  const rawValue = String(value ?? "");
  return externalSourceStatuses.find((status) => status === rawValue) ?? "not_configured";
}

export default async function NewIntegrationSourcePage() {
  const { venues } = await getScopedVenuesAndFields();

  async function createExternalSourceAction(formData: FormData) {
    "use server";

    const venueId = String(formData.get("venue_id") ?? "").trim();
    const sourceName = String(formData.get("source_name") ?? "").trim();

    if (!venueId || !sourceName) {
      return;
    }

    await createExternalSource({
      notes: String(formData.get("notes") ?? ""),
      source_name: sourceName,
      source_status: readSourceStatus(formData.get("source_status")),
      source_type: readSourceType(formData.get("source_type")),
      source_url: String(formData.get("source_url") ?? ""),
      venue_id: venueId,
    });

    revalidatePath("/admin/integrations");
    redirect("/admin/integrations");
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/integrations" className="text-sm font-bold text-[var(--accent-strong)]">Back to integrations</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Integrations</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create external source</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Store public links, feed URLs, and setup notes before API credentials or automated syncs exist.
        </p>
      </div>

      {venues.length === 0 ? (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-black text-amber-950">Create a venue first</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">External sources belong to a venue.</p>
        </div>
      ) : (
        <form action={createExternalSourceAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-white p-5">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Venue</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="venue_id" required>
              <option value="">Choose venue</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Source type</span>
              <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="source_type" required>
                {externalSourceTypes.map((type) => <option key={type} value={type}>{getExternalSourceTypeLabel(type)}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Status</span>
              <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="source_status" required>
                {externalSourceStatuses.map((status) => <option key={status} value={status}>{getExternalSourceStatusLabel(status)}</option>)}
              </select>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold">Source name</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="source_name" placeholder="Spring league public schedule" required />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">Public or feed URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="source_url" placeholder="https://..." />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">Notes</span>
            <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white p-3 text-base" name="notes" placeholder="Export steps, feed owner, refresh notes, or API setup context." />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
              Save source
            </button>
            <Link href="/admin/integrations" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
