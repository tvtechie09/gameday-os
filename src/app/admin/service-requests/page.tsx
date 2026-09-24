import Link from "next/link";
import { canViewCommandCenter } from "@/lib/access/capabilities";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { resolveSession } from "@/lib/access/session";
import { getVenueServiceRequests, type VenueServiceRequest } from "@/lib/services/venue-service-requests";
import { venueServiceRequestStatusLabel, venueServiceRequestTypeLabel, type VenueServiceRequestStatus } from "@/lib/services/venue-service-request-core";
import { transitionServiceRequestAction } from "./actions";

export const dynamic = "force-dynamic";

function nextTrainerStatuses(request: VenueServiceRequest): VenueServiceRequestStatus[] {
  if (request.status === "REQUESTED") return ["ACKNOWLEDGED", "RESOLVED"];
  if (request.status === "ACKNOWLEDGED") return ["EN_ROUTE", "IN_PROGRESS", "RESOLVED"];
  if (request.status === "EN_ROUTE") return ["IN_PROGRESS", "RESOLVED"];
  if (request.status === "IN_PROGRESS") return ["RESOLVED"];
  return [];
}

export default async function ServiceRequestsPage() {
  const session = await resolveSession();
  if (session.kind !== "active" || !canViewCommandCenter(session.context)) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-black">Service requests</h1>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">You do not have access to the Venue/Field Ops request queue.</p>
      </section>
    );
  }

  const [scoped, allRequests] = await Promise.all([getScopedVenuesAndFields(), getVenueServiceRequests()]);
  const fieldIds = new Set(scoped.fields.map((field) => field.id));
  const fieldNames = new Map(scoped.fields.map((field) => [field.id, field.name]));
  const venueNames = new Map(scoped.venues.map((venue) => [venue.id, venue.name]));
  const requests = allRequests.filter((request) => request.fieldId && fieldIds.has(request.fieldId));
  const activeRequests = requests.filter((request) => request.status !== "RESOLVED");
  const resolvedRequests = requests.filter((request) => request.status === "RESOLVED").slice(0, 20);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Venue / Field Ops</p>
      <h1 className="mt-2 text-3xl font-black">Service requests</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Trainer dispatch and field issues share one location-aware queue. Maintenance execution stays in the existing Work Order system.</p>
      <div className="mt-3 flex gap-4 text-sm font-bold">
        <Link className="text-[var(--accent-strong)] underline" href="/admin/fields">Fields</Link>
        <Link className="text-[var(--accent-strong)] underline" href="/admin/fields/work-orders">Work orders</Link>
      </div>

      <div className="mt-8 grid gap-4">
        {activeRequests.length === 0 ? <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]">No active service requests.</p> : null}
        {activeRequests.map((request) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{venueServiceRequestTypeLabel(request.requestType)}</p>
                <h2 className="mt-1 text-xl font-black">{request.fieldId ? fieldNames.get(request.fieldId) ?? "Field" : venueNames.get(request.venueId) ?? "Venue"}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{venueNames.get(request.venueId)} · {new Date(request.requestedAt).toLocaleString()}</p>
              </div>
              <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.1em] text-[var(--accent-strong)]">{venueServiceRequestStatusLabel(request.status)}</span>
            </div>
            {request.severity ? <p className="mt-3 text-sm font-black">Impact: {request.severity.replaceAll("_", " ")}</p> : null}
            {request.note ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{request.note}</p> : null}
            {request.requesterName ? <p className="mt-2 text-xs text-[var(--muted)]">Requested by {request.requesterName}</p> : null}

            {request.requestType === "MAINTENANCE_FIELD_ISSUE" ? (
              <div className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm">
                {request.fieldWorkOrderId ? (
                  <Link className="font-black text-[var(--accent-strong)] underline" href="/admin/fields/work-orders">Open linked Work Order</Link>
                ) : (
                  <span className="font-bold text-red-800">Work Order link is pending.</span>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                {nextTrainerStatuses(request).map((status) => (
                  <form action={transitionServiceRequestAction} key={status}>
                    <input name="request_id" type="hidden" value={request.id} />
                    <input name="next_status" type="hidden" value={status} />
                    <button className="min-h-10 rounded-lg bg-[var(--black-soft)] px-4 text-xs font-black text-white" type="submit">{venueServiceRequestStatusLabel(status)}</button>
                  </form>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {resolvedRequests.length > 0 ? (
        <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-black">Recently resolved</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {resolvedRequests.map((request) => <li className="border-b border-[var(--line)] pb-2 last:border-0" key={request.id}>{venueServiceRequestTypeLabel(request.requestType)} · {request.fieldId ? fieldNames.get(request.fieldId) : venueNames.get(request.venueId)}</li>)}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
