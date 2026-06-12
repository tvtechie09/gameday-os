import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";
import type { Field, Session, Sponsor, SponsorAssignment, Venue } from "@/lib/types";
import { SponsorAssignmentForm } from "./sponsor-assignment-form";

export const dynamic = "force-dynamic";

function getTargetName(assignment: SponsorAssignment, venues: Venue[], fields: Field[], sessions: Session[]) {
  if (assignment.assignmentType === "venue") {
    return venues.find((venue) => venue.id === assignment.venueId)?.name ?? "Venue unavailable";
  }

  if (assignment.assignmentType === "field") {
    return fields.find((field) => field.id === assignment.fieldId)?.name ?? "Field unavailable";
  }

  return sessions.find((session) => session.id === assignment.sessionId)?.title ?? "Session unavailable";
}

export default async function SponsorsPage() {
  let sponsors: Sponsor[] = [];
  let assignments: SponsorAssignment[] = [];
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    [sponsors, assignments, venues, fields, sessions] = await Promise.all([
      getSponsors(),
      getSponsorAssignments(),
      getVenues(),
      getFields(),
      getSessions(),
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load sponsors.";
  }

  const sponsorsById = new Map(sponsors.map((sponsor) => [sponsor.id, sponsor]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsors</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Sponsor engine</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Create sponsor profiles and assign them to venues, fields, or live sessions for public field pages.
          </p>
        </div>
        <Link href="/admin/sponsors/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New sponsor
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load sponsors</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-xl font-black">Sponsors</h2>
            {sponsors.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {sponsors.map((sponsor) => (
                  <article key={sponsor.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                    <div className="flex gap-4">
                      {sponsor.logoUrl ? (
                        <img alt="" className="h-14 w-14 rounded-lg border border-[var(--line)] object-contain p-1" src={sponsor.logoUrl} />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-lg font-black text-[var(--accent-strong)]">
                          {sponsor.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black">{sponsor.name}</h3>
                        {sponsor.websiteUrl ? (
                          <a className="mt-1 block truncate text-sm font-bold text-[var(--accent-strong)]" href={sponsor.websiteUrl} rel="noreferrer" target="_blank">
                            Website
                          </a>
                        ) : null}
                        {sponsor.description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{sponsor.description}</p> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="No sponsors yet"
                  message="Create a sponsor profile before assigning it to venues, fields, or sessions."
                  actionHref="/admin/sponsors/new"
                  actionLabel="Create sponsor"
                />
              </div>
            )}
          </section>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-xl font-black">Assign sponsor</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Assign sponsors to a venue, field, or session. Matching assignments appear on the public field page.
            </p>
            <SponsorAssignmentForm fields={fields} sessions={sessions} sponsors={sponsors} venues={venues} />
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black">Assignments</h2>
            {assignments.length > 0 ? (
              <div className="mt-4 grid gap-4">
                {assignments.map((assignment) => {
                  const sponsor = sponsorsById.get(assignment.sponsorId);
                  return (
                    <article key={assignment.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{assignment.placementLabel}</p>
                          <h3 className="mt-2 text-lg font-black">{sponsor?.name ?? "Sponsor unavailable"}</h3>
                          <p className="mt-1 text-sm font-semibold capitalize text-[var(--muted)]">
                            {assignment.assignmentType} · {getTargetName(assignment, venues, fields, sessions)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">
                No sponsor assignments yet.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
