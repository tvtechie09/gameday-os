import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CircleAlert } from "lucide-react";
import { GameDayCard, PageShell, PageTitle, StatusChip, buttonStyles } from "@/components/ui/gameday-ui";
import { canOpenCloseField, canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { buildFieldDisruptionReview } from "@/lib/services/field-disruption-core";
import { getSessions } from "@/lib/services/sessions";
import { timeLabel } from "@/lib/services/session-projection-core";
import { getWorkOrders } from "@/lib/services/work-orders";
import type { Session } from "@/lib/types";
import { fieldStatusPresentation, gameStatusPresentation } from "@/lib/ui/status-presentation";

export const dynamic = "force-dynamic";

function currentProjectionTime() {
  return Date.now();
}

function gameLabel(session: Session) {
  return session.title || `${session.homeTeam} vs ${session.awayTeam}`;
}

function ImpactGroup({
  canMove,
  fieldId,
  sessions,
  timeZone,
  title,
}: {
  canMove: boolean;
  fieldId: string;
  sessions: Session[];
  timeZone: string;
  title: string;
}) {
  if (sessions.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        <span className="text-sm font-bold text-[var(--muted)]">{sessions.length}</span>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {sessions.map((session) => {
          const status = gameStatusPresentation(session.status, session.lifecycleStatus);
          const reviewPath = `/admin/sessions/${session.id}`;
          const movePath = `/admin/fields/${fieldId}/disruption/${session.id}/move`;
          return (
            <GameDayCard
              date={title}
              eventName={gameLabel(session)}
              key={session.id}
              location="Affected field"
              opponent={`${session.homeTeam} vs ${session.awayTeam}`}
              primaryAction={<Link className={buttonStyles("primary")} href={canMove ? movePath : reviewPath}>{canMove ? "Move game" : "Review game"}</Link>}
              startTime={timeLabel(session.startTime, timeZone)}
              status={status.label}
              statusTone={status.tone}
            />
          );
        })}
      </div>
    </section>
  );
}

export default async function FieldDisruptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ fieldId: string }>;
  searchParams?: Promise<{ moved?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));
  const { fieldId } = await params;
  const [{ venues, fields }, sessions, workOrders] = await Promise.all([
    getScopedVenuesAndFields(),
    getSessions(),
    getWorkOrders(),
  ]);
  const field = fields.find((candidate) => candidate.id === fieldId);
  if (!field) notFound();
  const venue = venues.find((candidate) => candidate.id === field.venueId);
  if (!venue) notFound();

  const review = buildFieldDisruptionReview({ field, venue, sessions, workOrders, now: currentProjectionTime() });
  const status = fieldStatusPresentation(field.status);
  const moved = (await searchParams)?.moved;
  const canMove = canOpenCloseField(ctx);

  return (
    <PageShell size="wide">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--accent-strong)]" href="/admin/fields"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to Field Operations</Link>
      <PageTitle
        description="See which games need a human decision, then open the existing conflict-checked movement workflow. Nothing moves automatically."
        eyebrow="Field disruption review"
        title={field.name}
      />

      {moved ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900" role="status">{moved}</p> : null}

      <section className="mt-6 grid gap-4 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2"><StatusChip tone={status.tone}>{status.label}</StatusChip>{review.unresolvedIssues.length > 0 ? <StatusChip tone="warning">{review.unresolvedIssues.length} open issue{review.unresolvedIssues.length === 1 ? "" : "s"}</StatusChip> : null}</div>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">{review.explanation}</p>
          <p className="mt-3 flex items-start gap-2 text-sm font-bold text-[var(--foreground)]"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />Schedule changes remain manual and conflict-checked.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Link className={buttonStyles("secondary")} href={`/admin/fields/work-orders?fieldId=${encodeURIComponent(field.id)}`}>View field issues</Link>
          <Link className={buttonStyles("secondary")} href={`/admin/sessions?q=${encodeURIComponent(field.name)}`}>Open full schedule</Link>
        </div>
      </section>

      <div className="mt-8 grid gap-8">
        <ImpactGroup canMove={canMove} fieldId={field.id} sessions={review.inProgress} timeZone={venue.timezone} title="In Progress" />
        <ImpactGroup canMove={canMove} fieldId={field.id} sessions={review.startingSoon} timeZone={venue.timezone} title="Starting Soon" />
        <ImpactGroup canMove={canMove} fieldId={field.id} sessions={review.laterToday} timeZone={venue.timezone} title="Later Today" />
      </div>

      {review.affectedCount === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-[var(--line)] bg-white p-8 text-center">
          <CircleAlert aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--muted)]" />
          <h2 className="mt-3 text-xl font-black">No remaining games are affected.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">There is no current or future valid game on this field for the venue&apos;s operating day.</p>
        </section>
      ) : null}
    </PageShell>
  );
}
