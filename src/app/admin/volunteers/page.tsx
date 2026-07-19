import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessions } from "@/lib/services/sessions";
import { getVolunteerRoleLabel, getVolunteerRoles } from "@/lib/services/volunteer-roles";
import { VolunteerStatusButton } from "./status-button";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "active") {
    return "bg-green-600 text-white";
  }

  if (status === "approved") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }

  if (status === "requested") {
    return "bg-amber-100 text-amber-950";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-900";
  }

  return "bg-slate-100 text-slate-700";
}

export default async function VolunteersPage() {
  const [allRoles, scoped, sessions] = await Promise.all([getVolunteerRoles(), getScopedVenuesAndFields(), getSessions()]);
  const venuesById = new Map(scoped.venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(scoped.fields.map((field) => [field.id, field]));
  // Isolate to the caller's venues (no-op for platform/org admins).
  const roles = allRoles.filter((role) => venuesById.has(role.venueId));
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Volunteers</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Volunteer roles</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Review scorekeepers, stream operators, audio operators, announcers, scoreboard operators, and field admins.
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        {roles.length > 0 ? roles.map((role) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={role.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{getVolunteerRoleLabel(role.roleType)}</p>
                  <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(role.status)}`}>
                    {role.status}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-black">{role.displayName}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  {venuesById.get(role.venueId)?.name ?? "Venue unavailable"} · {fieldsById.get(role.fieldId)?.name ?? "Field unavailable"}
                  {role.sessionId ? ` · ${sessionsById.get(role.sessionId)?.title ?? "Session unavailable"}` : ""}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {role.contactName ? `Contact: ${role.contactName}` : "No contact name"}
                  {role.contactEmail ? ` · ${role.contactEmail}` : ""}
                  {role.contactPhone ? ` · ${role.contactPhone}` : ""}
                </p>
                {role.notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{role.notes}</p> : null}
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Requested {formatDateTime(role.createdAt)}
                </p>
              </div>
              <div className="grid gap-2 sm:min-w-40">
                {role.status === "requested" ? (
                  <>
                    <VolunteerStatusButton id={role.id} label="Approve" status="approved" />
                    <VolunteerStatusButton id={role.id} label="Reject" status="rejected" />
                  </>
                ) : null}
                {role.status === "approved" ? <VolunteerStatusButton id={role.id} label="Mark active" status="active" /> : null}
                {role.status === "active" ? <VolunteerStatusButton id={role.id} label="End role" status="ended" /> : null}
              </div>
            </div>
          </article>
        )) : (
          <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">No volunteer role requests yet.</p>
        )}
      </div>
    </section>
  );
}
