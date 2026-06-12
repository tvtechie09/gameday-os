import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAnalytics, readSponsorAnalyticsRange, sponsorAnalyticsRanges } from "@/lib/services/sponsor-analytics";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";
import type { Field, Session, Sponsor, SponsorAnalyticsSummary, SponsorAssignment, Venue } from "@/lib/types";
import { DeleteButton } from "./delete-button";
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

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCtr(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

type SponsorsPageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

export default async function SponsorsPage({ searchParams }: SponsorsPageProps) {
  const resolvedSearchParams = await searchParams;
  const analyticsRange = readSponsorAnalyticsRange(resolvedSearchParams?.range);
  let sponsors: Sponsor[] = [];
  let assignments: SponsorAssignment[] = [];
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let analytics: SponsorAnalyticsSummary[] = [];
  let errorMessage: string | null = null;

  try {
    [sponsors, assignments, venues, fields, sessions] = await Promise.all([
      getSponsors(),
      getSponsorAssignments(),
      getVenues(),
      getFields(),
      getSessions(),
    ]);
    analytics = await getSponsorAnalytics(sponsors.map((sponsor) => sponsor.id), analyticsRange);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load sponsors.";
  }

  const sponsorsById = new Map(sponsors.map((sponsor) => [sponsor.id, sponsor]));
  const analyticsBySponsorId = new Map(analytics.map((summary) => [summary.sponsorId, summary]));
  const totals = analytics.reduce(
    (summary, sponsorAnalytics) => ({
      impressions: summary.impressions + sponsorAnalytics.impressions,
      clicks: summary.clicks + sponsorAnalytics.clicks,
    }),
    { impressions: 0, clicks: 0 },
  );
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

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
          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Sponsor analytics</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Lightweight visibility and engagement totals. No cookies, no users, no personal information.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sponsorAnalyticsRanges.map((range) => (
                  <Link
                    aria-current={range.value === analyticsRange ? "page" : undefined}
                    className={
                      range.value === analyticsRange
                        ? "inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-white"
                        : "inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold"
                    }
                    href={`/admin/sponsors?range=${range.value}`}
                    key={range.value}
                  >
                    {range.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[var(--background)] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Total impressions</p>
                <p className="mt-2 text-3xl font-black">{totals.impressions}</p>
              </div>
              <div className="rounded-lg bg-[var(--background)] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Total clicks</p>
                <p className="mt-2 text-3xl font-black">{totals.clicks}</p>
              </div>
              <div className="rounded-lg bg-[var(--background)] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">CTR</p>
                <p className="mt-2 text-3xl font-black">{formatCtr(totalCtr)}</p>
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black">Sponsors</h2>
            {sponsors.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {sponsors.map((sponsor) => (
                  <article key={sponsor.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                    {(() => {
                      const sponsorAnalytics = analyticsBySponsorId.get(sponsor.id) ?? {
                        sponsorId: sponsor.id,
                        impressions: 0,
                        clicks: 0,
                        ctr: 0,
                      };
                      return (
                        <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-[var(--background)] p-3 text-center">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Views</p>
                            <p className="mt-1 text-lg font-black">{sponsorAnalytics.impressions}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Clicks</p>
                            <p className="mt-1 text-lg font-black">{sponsorAnalytics.clicks}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">CTR</p>
                            <p className="mt-1 text-lg font-black">{formatCtr(sponsorAnalytics.ctr)}</p>
                          </div>
                        </div>
                      );
                    })()}
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
                    <div className="mt-5 flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatUpdatedAt(sponsor.updatedAt)}</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Link href={`/admin/sponsors/${sponsor.id}?range=${analyticsRange}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                          Analytics
                        </Link>
                        <Link href={`/admin/sponsors/${sponsor.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                          Edit
                        </Link>
                        <DeleteButton id={sponsor.id} label="Delete" message={`Delete sponsor "${sponsor.name}" and its assignments?`} type="sponsor" />
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
                          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Updated {formatUpdatedAt(assignment.updatedAt)}
                          </p>
                        </div>
                        <DeleteButton id={assignment.id} label="Delete assignment" message="Delete this sponsor assignment?" type="assignment" />
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
