import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PageShell, PageTitle, buttonStyles } from "@/components/ui/gameday-ui";
import { canOpenCloseField, canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { findScheduleConflicts, planSingleGameMove } from "@/lib/services/schedule-operations-core";
import { buildFieldDisruptionReview } from "@/lib/services/field-disruption-core";
import { getSession, getSessions } from "@/lib/services/sessions";
import { getWorkOrders } from "@/lib/services/work-orders";
import { MoveGameForm } from "./move-game-form";

export const dynamic = "force-dynamic";

function currentProjectionTime() {
  return Date.now();
}

export default async function MoveAffectedGamePage({ params }: { params: Promise<{ fieldId: string; sessionId: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));
  const { fieldId, sessionId } = await params;
  if (!canOpenCloseField(ctx)) redirect(`/admin/sessions/${sessionId}`);

  const [{ venues, fields }, session, sessions, workOrders] = await Promise.all([
    getScopedVenuesAndFields(),
    getSession(sessionId),
    getSessions(),
    getWorkOrders(),
  ]);
  const field = fields.find((candidate) => candidate.id === fieldId);
  if (!field || !session) notFound();
  const venue = venues.find((candidate) => candidate.id === field.venueId);
  if (!venue) notFound();
  if (session.fieldId !== field.id) {
    const currentField = fields.find((candidate) => candidate.id === session.fieldId);
    if (!currentField || currentField.venueId !== venue.id) notFound();
    const label = session.title || `${session.homeTeam} vs ${session.awayTeam}`;
    const message = `${label} moved from ${field.name} to ${currentField.name}. Public schedule updated.`;

    return (
      <PageShell>
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950" role="status">
          <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.14em]">Game moved</p>
          <h1 className="mt-1 text-3xl font-black">{label}</h1>
          <p className="mt-3 text-base font-bold">{field.name} → {currentField.name}</p>
          <p className="mt-2 text-sm font-semibold">Public schedule updated.</p>
          <Link className={buttonStyles("primary", "mt-5")} href={`/admin/fields/${field.id}/disruption?moved=${encodeURIComponent(message)}`}>Return to disruption review</Link>
        </section>
      </PageShell>
    );
  }
  const review = buildFieldDisruptionReview({ field, venue, sessions, workOrders, now: currentProjectionTime() });
  const affectedIds = new Set([...review.inProgress, ...review.startingSoon, ...review.laterToday].map((game) => game.id));
  if (!affectedIds.has(session.id)) notFound();
  const venueFields = fields.filter((candidate) => candidate.venueId === venue.id && candidate.id !== field.id);
  const targetFields = venueFields.map((candidate) => {
    const change = planSingleGameMove(session, { fieldId: candidate.id, reason: "Game moved" });
    const conflict = findScheduleConflicts(sessions, [change])[0];
    return { id: candidate.id, name: candidate.name, conflictMessage: conflict?.message ?? null };
  });

  return (
    <PageShell>
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--accent-strong)]" href={`/admin/fields/${field.id}/disruption`}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to disruption review</Link>
      <PageTitle
        description={`${field.name} is ${field.status}. Choose one new field; the start time stays unchanged unless you explicitly change it.`}
        eyebrow="Manual recovery"
        title={`Move ${session.title || `${session.homeTeam} vs ${session.awayTeam}`}`}
      />
      <div className="mt-7">
        <MoveGameForm
          fieldId={field.id}
          fieldName={field.name}
          gameLabel={session.title || `${session.homeTeam} vs ${session.awayTeam}`}
          sessionId={session.id}
          startTime={session.startTime}
          targetFields={targetFields}
          timeZone={venue.timezone}
        />
      </div>
    </PageShell>
  );
}
