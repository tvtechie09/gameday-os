import Link from "next/link";
import { getFields } from "@/lib/services/fields";
import { getActivationLabel, getResourceActivations } from "@/lib/services/resource-activations";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import { ActivationStatusButton, AssignActivationButton } from "./status-button";

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
  const activeSessionByFieldId = new Map(sessions.filter((session) => session.status === "active" || session.gameStatus === "active").map((session) => [session.fieldId, session]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Community</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Community Contributions</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Parent and volunteer contributions go live immediately. Use this screen to end contributions that are no longer useful.
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
                {activation.approvedAt ? (
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Shared by {activation.approvedBy ?? "Community"} · {formatDateTime(activation.approvedAt)}
                  </p>
                ) : null}
                {activation.assignedToSession ? (
                  <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                    Assigned to session
                  </p>
                ) : null}
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {formatDateTime(activation.startsAt)} - {formatDateTime(activation.endsAt)}
                </p>
              </div>
              <div className="grid gap-2 sm:min-w-40">
                {activation.status === "requested" ? (
                  <>
                    <ActivationStatusButton id={activation.id} label="Mark Active" status="active" />
                    <ActivationStatusButton id={activation.id} label="Remove" status="rejected" />
                    {activeSessionByFieldId.get(activation.fieldId) ? (
                      <AssignActivationButton id={activation.id} sessionId={activeSessionByFieldId.get(activation.fieldId)?.id ?? ""} />
                    ) : null}
                  </>
                ) : null}
                {activation.status === "active" && !activation.assignedToSession && activeSessionByFieldId.get(activation.fieldId) ? (
                  <AssignActivationButton id={activation.id} sessionId={activeSessionByFieldId.get(activation.fieldId)?.id ?? ""} />
                ) : null}
                {activation.status === "active" ? <ActivationStatusButton id={activation.id} label="End" status="ended" /> : null}
              </div>
            </div>
          </article>
        )) : (
          <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">No community contributions yet.</p>
        )}
      </div>
    </section>
  );
}
