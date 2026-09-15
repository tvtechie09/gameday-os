import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getResources, getResourceStatusLabel, getResourceTypeLabel } from "@/lib/services/resources";

export const dynamic = "force-dynamic";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "active") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }
  if (status === "maintenance") {
    return "bg-amber-100 text-amber-900";
  }
  if (status === "inactive") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-white text-[var(--muted)] ring-1 ring-[var(--line)]";
}

function assignmentLabel({
  fieldName,
  venueName,
}: {
  fieldName?: string;
  venueName?: string;
}) {
  if (fieldName) {
    return `${venueName ?? "Venue unavailable"} · ${fieldName}`;
  }

  return `${venueName ?? "Venue unavailable"} · Venue-wide`;
}

export default async function ResourcesPage() {
  const [allResources, scoped] = await Promise.all([getResources(), getScopedVenuesAndFields()]);
  const venuesById = new Map(scoped.venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(scoped.fields.map((field) => [field.id, field]));
  // Isolate to the caller's venues (no-op for platform/org admins, who scope to all).
  const resources = allResources.filter((resource) => venuesById.has(resource.venueId));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Inventory</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Venue Systems</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Track scoreboards, cameras, audio profiles, and other resources used by operations and public field pages.
            Listed systems are inventory unless a connected integration explicitly reports live status.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/resources/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Dashboard
          </Link>
          <Link href="/admin/resources/activations" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Activations
          </Link>
          <Link href="/admin/resources/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            New resource
          </Link>
        </div>
      </div>

      {resources.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {resources.map((resource) => (
            <article key={resource.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {resource.resourceType !== "other" ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{getResourceTypeLabel(resource.resourceType)}</p> : null}
                    {resource.status !== "unknown" ? <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(resource.status)}`}>{getResourceStatusLabel(resource.status)}</span> : null}
                  </div>
                  <h2 className="mt-2 text-xl font-black">{resource.resourceName}</h2>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-[var(--background)] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Assigned venue</p>
                      <p className="mt-1 text-sm font-black">{venuesById.get(resource.venueId)?.name ?? "Venue unavailable"}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--background)] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Assigned field</p>
                      <p className="mt-1 text-sm font-black">{resource.fieldId ? fieldsById.get(resource.fieldId)?.name ?? "Field unavailable" : "Venue-wide"}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--background)] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Assignment</p>
                      <p className="mt-1 text-sm font-black">
                        {assignmentLabel({
                          fieldName: resource.fieldId ? fieldsById.get(resource.fieldId)?.name : undefined,
                          venueName: venuesById.get(resource.venueId)?.name,
                        })}
                      </p>
                    </div>
                  </div>
                  {(resource.manufacturer || resource.model || resource.serialNumber) ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {[resource.manufacturer, resource.model, resource.serialNumber].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {resource.notes ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{resource.notes}</p> : null}
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(resource.updatedAt)}</p>
                </div>
                <Link href={`/admin/resources/${resource.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No resources yet" message="Create a resource to track field cameras, audio, scoreboards, displays, network gear, or streaming equipment." actionHref="/admin/resources/new" actionLabel="Create resource" />
        </div>
      )}
    </section>
  );
}
