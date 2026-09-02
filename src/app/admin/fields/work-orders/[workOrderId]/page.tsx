import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, History, MapPin } from "lucide-react";
import { AlertBanner, PageShell, PageTitle, StatusChip, buttonStyles } from "@/components/ui/gameday-ui";
import { canManageVenueSettings, canOpenCloseField, canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { timeLabel } from "@/lib/services/session-projection-core";
import { resolveIssueStage, workOrderAuditPresentation } from "@/lib/services/work-order-core";
import { getSession } from "@/lib/services/sessions";
import { getWorkOrder, getWorkOrderHistory, getWorkOrderPeople } from "@/lib/services/work-orders";
import { fieldStatusPresentation, gameStatusPresentation } from "@/lib/ui/status-presentation";
import { WorkOrderCard, type WorkOrderGameContext } from "../work-order-card";

export const dynamic = "force-dynamic";

function currentProjectionTime() {
  return Date.now();
}

function formatTimestamp(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ workOrderId: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));

  const { workOrderId } = await params;
  const scoped = await getScopedVenuesAndFields();
  const order = await getWorkOrder(workOrderId);
  if (!order || !scoped.venues.some((venue) => venue.id === order.venueId)) notFound();
  const field = order.fieldId ? scoped.fields.find((candidate) => candidate.id === order.fieldId) : undefined;
  if (order.fieldId && !field) notFound();
  const venue = scoped.venues.find((candidate) => candidate.id === order.venueId);
  if (!venue) notFound();

  const [people, history, relatedSession] = await Promise.all([
    getWorkOrderPeople([order.venueId], order.assignedToUserId ? [order.assignedToUserId] : []),
    getWorkOrderHistory(order.id),
    order.gameId ? getSession(order.gameId) : Promise.resolve(null),
  ]);
  const session = relatedSession && scoped.fields.some((candidate) => candidate.id === relatedSession.fieldId) ? relatedSession : null;
  const gameStatus = session ? gameStatusPresentation(session.status, session.lifecycleStatus) : null;
  const game: WorkOrderGameContext | null = session && gameStatus ? {
    href: `/admin/sessions/${session.id}`,
    label: session.title || `${session.homeTeam} vs ${session.awayTeam}`,
    startLabel: timeLabel(session.startTime, venue.timezone),
    statusLabel: gameStatus.label,
  } : null;
  const assignee = order.assignedToUserId ? people.find((person) => person.id === order.assignedToUserId) : undefined;
  const fieldName = field?.name ?? "Venue-wide";
  const fieldHref = field ? `/admin/fields?fieldId=${encodeURIComponent(field.id)}` : "/admin/fields";
  const listHref = field ? `/admin/fields/work-orders?fieldId=${encodeURIComponent(field.id)}` : "/admin/fields/work-orders";
  const resolved = resolveIssueStage(order) === "resolved";
  const fieldStatus = field ? fieldStatusPresentation(field.status) : null;

  return (
    <PageShell size="default">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--accent-strong)]" href={listHref}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to Work Orders</Link>
      <PageTitle description={`${venue.name} · ${fieldName}`} eyebrow="Work order" title={order.title} />

      {resolved ? (
        <div className="mt-5">
          <AlertBanner title="Resolution recorded" tone="success">
            {order.resolutionNotes || "This work order is complete. The resolution and actor history remain available below."}
          </AlertBanner>
        </div>
      ) : null}

      {resolved && fieldStatus && field && field.status !== "open" && field.status !== "active" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
          <div className="flex flex-wrap items-center gap-2"><StatusChip tone={fieldStatus.tone}>Field {fieldStatus.label}</StatusChip><span>Resolving work does not automatically reopen the field.</span></div>
          <Link className={buttonStyles("secondary", "mt-3 w-full sm:w-auto")} href={fieldHref}>Review {field.name}</Link>
        </div>
      ) : null}

      <div className="mt-6">
        <WorkOrderCard
          assigneeName={assignee?.displayName ?? (order.assignedToUserId ? "Venue teammate" : null)}
          assignees={people.filter((person) => person.venueIds.includes(order.venueId))}
          canManage={canManageVenueSettings(ctx)}
          canWork={canOpenCloseField(ctx)}
          currentUserId={ctx.userId}
          detailHref={`/admin/fields/work-orders/${order.id}`}
          disruptionHref={field ? `/admin/fields/${field.id}/disruption` : null}
          fieldHref={fieldHref}
          fieldName={fieldName}
          game={game}
          now={currentProjectionTime()}
          order={order}
        />
      </div>

      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-black"><MapPin aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />Issue Context</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-black text-[var(--muted)]">Field</dt><dd className="mt-1 font-semibold">{fieldName}</dd></div>
          <div><dt className="font-black text-[var(--muted)]">Reported</dt><dd className="mt-1 font-semibold">{formatTimestamp(order.createdAt, venue.timezone)}</dd></div>
          <div className="sm:col-span-2"><dt className="font-black text-[var(--muted)]">Details</dt><dd className="mt-1 whitespace-pre-wrap font-semibold leading-6">{order.detail || "No additional details were provided."}</dd></div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-black"><History aria-hidden="true" className="h-5 w-5 text-[var(--accent-strong)]" />History</h2>
        {history.length > 0 ? (
          <ol className="mt-4 grid gap-4 border-l-2 border-[var(--line)] pl-4">
            {history.map((event) => (
              <li className="relative" key={event.id}>
                <CheckCircle2 aria-hidden="true" className="absolute -left-[1.7rem] top-0.5 h-5 w-5 rounded-full bg-white text-[var(--accent-strong)]" />
                <p className="text-sm font-black leading-6">{workOrderAuditPresentation(event)}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{formatTimestamp(event.createdAt, venue.timezone)}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm font-semibold text-[var(--muted)]">This legacy work order predates actor history. Its current lifecycle timestamps remain preserved.</p>
        )}
      </section>
    </PageShell>
  );
}
