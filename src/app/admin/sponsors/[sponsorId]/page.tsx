import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAnalyticsForSponsor, readSponsorAnalyticsRange, sponsorAnalyticsRanges } from "@/lib/services/sponsor-analytics";
import { getSponsor, getSponsorAssignments } from "@/lib/services/sponsors";
import { getScopedOrganizationIds, getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import type { Field, Session, SponsorAssignment, Venue } from "@/lib/types";

type SponsorDetailPageProps = {
  params: Promise<{
    sponsorId: string;
  }>;
  searchParams?: Promise<{
    range?: string;
  }>;
};

function formatCtr(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function getTargetName(assignment: SponsorAssignment, venues: Venue[], fields: Field[], sessions: Session[]) {
  if (assignment.assignmentType === "venue") {
    return venues.find((venue) => venue.id === assignment.venueId)?.name ?? "Venue unavailable";
  }

  if (assignment.assignmentType === "field") {
    return fields.find((field) => field.id === assignment.fieldId)?.name ?? "Field unavailable";
  }

  return sessions.find((session) => session.id === assignment.sessionId)?.title ?? "Session unavailable";
}

export default async function SponsorDetailPage({ params, searchParams }: SponsorDetailPageProps) {
  const [{ sponsorId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const analyticsRange = readSponsorAnalyticsRange(resolvedSearchParams?.range);
  const [sponsor, allAssignments, scoped, sessions, analytics] = await Promise.all([
    getSponsor(sponsorId),
    getSponsorAssignments(),
    getScopedVenuesAndFields(),
    getSessions(),
    getSponsorAnalyticsForSponsor(sponsorId, analyticsRange),
  ]);
  const { venues, fields } = scoped;

  if (!sponsor) {
    notFound();
  }

  // Object-level authorization: a venue-scoped admin (venue_director holds
  // sponsor.manage) must not open another org's sponsor by URL.
  const scopedOrgIds = await getScopedOrganizationIds();
  if (scopedOrgIds && sponsor.organizationId && !scopedOrgIds.has(sponsor.organizationId)) {
    notFound();
  }

  const assignments = allAssignments.filter((assignment) => assignment.sponsorId === sponsor.id);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/sponsors" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to sponsors
      </Link>

      <div className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            {sponsor.logoUrl ? (
              <Image alt="" className="h-20 w-20 rounded-lg border border-[var(--line)] object-contain p-2" height={80} src={sponsor.logoUrl} unoptimized width={80} />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-2xl font-black text-[var(--accent-strong)]">
                {sponsor.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsor</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{sponsor.name}</h1>
              {sponsor.description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{sponsor.description}</p> : null}
              {sponsor.websiteUrl ? (
                <a className="mt-3 inline-flex text-sm font-bold text-[var(--accent-strong)]" href={sponsor.websiteUrl} rel="noreferrer" target="_blank">
                  Website
                </a>
              ) : null}
            </div>
          </div>
          <Link href={`/admin/sponsors/${sponsor.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
            Edit sponsor
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Analytics</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Visibility and engagement for public field pages.</p>
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
                href={`/admin/sponsors/${sponsor.id}?range=${range.value}`}
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
            <p className="mt-2 text-3xl font-black">{analytics.impressions}</p>
          </div>
          <div className="rounded-lg bg-[var(--background)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Total clicks</p>
            <p className="mt-2 text-3xl font-black">{analytics.clicks}</p>
          </div>
          <div className="rounded-lg bg-[var(--background)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">CTR</p>
            <p className="mt-2 text-3xl font-black">{formatCtr(analytics.ctr)}</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Assignment locations</h2>
        {assignments.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{assignment.placementLabel}</p>
                <h3 className="mt-2 text-lg font-black">{getTargetName(assignment, venues, fields, sessions)}</h3>
                <p className="mt-1 text-sm font-semibold capitalize text-[var(--muted)]">{assignment.assignmentType} placement</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">
            This sponsor is not assigned to any venues, fields, or sessions yet.
          </p>
        )}
      </section>
    </section>
  );
}
