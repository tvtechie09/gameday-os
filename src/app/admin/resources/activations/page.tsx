import Link from "next/link";
import { getFields } from "@/lib/services/fields";
import { getActivationLabel, getResourceActivations } from "@/lib/services/resource-activations";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import { ActivationStatusButton } from "./status-button";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ResourceActivationsPage() {
  const [activations, venues, fields, sessions] = await Promise.all([getResourceActivations(), getVenues(), getFields(), getSessions()]);
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Inventory</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Resource activations</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Review volunteer and parent resource activation requests.
          </p>
        </div>
        <Link href="/admin/resources" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
          Resource inventory
        </Link>
      </div>

      <div className="mt-8 grid gap-4">
        {activations.length > 0 ? activations.map((activation) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={activation.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{activation.activationType.replace("_", " ")}</p>
                  <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em]">{activation.status}</span>
                </div>
                <h2 className="mt-2 text-xl font-black">{getActivationLabel(activation.activationType)}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  {venuesById.get(activation.venueId)?.name ?? "Venue unavailable"} · {fieldsById.get(activation.fieldId)?.name ?? "Field unavailable"}
                  {activation.sessionId ? ` · ${sessionsById.get(activation.sessionId)?.title ?? "Session unavailable"}` : ""}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Display: <span className="font-bold text-[var(--foreground)]">{activation.displayName}</span>
                  {activation.contactName ? ` · Contact: ${activation.contactName}` : ""}
                </p>
                {activation.resourceUrl ? <p className="mt-2 break-all text-sm font-bold text-[var(--accent-strong)]">{activation.resourceUrl}</p> : null}
                {activation.notes ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{activation.notes}</p> : null}
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {formatDateTime(activation.startsAt)} - {formatDateTime(activation.endsAt)}
                </p>
              </div>
              <div className="grid gap-2 sm:min-w-40">
                {activation.status === "requested" ? (
                  <>
                    <ActivationStatusButton id={activation.id} label="Approve" status="active" />
                    <ActivationStatusButton id={activation.id} label="Reject" status="rejected" />
                  </>
                ) : null}
                {activation.status === "active" ? <ActivationStatusButton id={activation.id} label="End" status="ended" /> : null}
              </div>
            </div>
          </article>
        )) : (
          <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">No activation requests yet.</p>
        )}
      </div>
    </section>
  );
}
