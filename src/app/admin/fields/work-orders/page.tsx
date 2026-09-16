import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { EmptyState, ErrorState, PageShell, PageTitle } from "@/components/ui/gameday-ui";
import { canManageVenueSettings, canOpenCloseField, canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { publicErrorMessage } from "@/lib/public-error";
import { issueLifecycle, orderIssues, resolveIssueStage } from "@/lib/services/work-order-core";
import { getSessionsByIds } from "@/lib/services/sessions";
import { timeLabel } from "@/lib/services/session-projection-core";
import { getWorkOrderPeople, getWorkOrdersForVenues, type WorkOrder, type WorkOrderPerson } from "@/lib/services/work-orders";
import type { Field, Session, Venue } from "@/lib/types";
import { gameStatusPresentation } from "@/lib/ui/status-presentation";
import { WorkOrderCard, type WorkOrderGameContext } from "./work-order-card";
import { WorkOrderForm } from "./work-order-form";

export const dynamic = "force-dynamic";

type WorkOrderView = "attention" | "mine" | "open" | "resolved";

const views: Array<{ key: WorkOrderView; label: string }> = [
  { key: "attention", label: "Needs Attention" },
  { key: "mine", label: "Mine" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

function currentProjectionTime() {
  return Date.now();
}

function readView(value?: string): WorkOrderView {
  return views.some((candidate) => candidate.key === value) ? value as WorkOrderView : "attention";
}

function isResolved(order: WorkOrder) {
  return resolveIssueStage(order) === "resolved";
}

function needsAttention(order: WorkOrder, now: number) {
  const life = issueLifecycle(order, now);
  return !isResolved(order) && (life.unowned || life.isOverdue || order.priority === "high" || order.priority === "urgent");
}

function matchesView(order: WorkOrder, view: WorkOrderView, userId: string, now: number) {
  if (view === "attention") return needsAttention(order, now);
  if (view === "mine") return !isResolved(order) && (order.assignedToUserId === userId || order.acknowledgedBy === userId);
  if (view === "resolved") return isResolved(order);
  return !isResolved(order);
}

function viewHref(view: WorkOrderView, fieldId?: string) {
  const query = new URLSearchParams({ view });
  if (fieldId) query.set("fieldId", fieldId);
  return `/admin/fields/work-orders?${query.toString()}`;
}

function gameContext(session: Session | undefined, venue: Venue | undefined): WorkOrderGameContext | null {
  if (!session || !venue) return null;
  const status = gameStatusPresentation(session.status, session.lifecycleStatus);
  return {
    href: `/admin/sessions/${session.id}`,
    label: session.title || `${session.homeTeam} vs ${session.awayTeam}`,
    startLabel: timeLabel(session.startTime, venue.timezone),
    statusLabel: status.label,
  };
}

type WorkOrderPageData = {
  assigneeById: Map<string, WorkOrderPerson>;
  errorMessage: string | null;
  fields: Field[];
  people: WorkOrderPerson[];
  sessionsById: Map<string, Session>;
  venues: Venue[];
  workOrders: WorkOrder[];
};

async function loadPageData(): Promise<WorkOrderPageData> {
  try {
    const scoped = await getScopedVenuesAndFields();
    const venueIds = scoped.venues.map((venue) => venue.id);
    const workOrders = await getWorkOrdersForVenues(venueIds);
    const assignedIds = workOrders.map((order) => order.assignedToUserId).filter((id): id is string => Boolean(id));
    const gameIds = workOrders.map((order) => order.gameId).filter((id): id is string => Boolean(id));
    const [people, allSessions] = await Promise.all([
      getWorkOrderPeople(venueIds, assignedIds),
      getSessionsByIds(gameIds),
    ]);
    const fieldIds = new Set(scoped.fields.map((field) => field.id));
    const sessions = allSessions.filter((session) => fieldIds.has(session.fieldId));
    return {
      assigneeById: new Map(people.map((person) => [person.id, person])),
      errorMessage: null,
      fields: scoped.fields,
      people,
      sessionsById: new Map(sessions.map((session) => [session.id, session])),
      venues: scoped.venues,
      workOrders,
    };
  } catch (error) {
    return {
      assigneeById: new Map(),
      errorMessage: publicErrorMessage(error, "Unable to load work orders."),
      fields: [],
      people: [],
      sessionsById: new Map(),
      venues: [],
      workOrders: [],
    };
  }
}

export default async function WorkOrdersPage({ searchParams }: { searchParams?: Promise<{ fieldId?: string; view?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));

  const requested = await searchParams;
  const data = await loadPageData();
  const now = currentProjectionTime();
  const view = readView(requested?.view);
  const fieldById = new Map(data.fields.map((field) => [field.id, field]));
  const venueById = new Map(data.venues.map((venue) => [venue.id, venue]));
  const selectedField = requested?.fieldId ? fieldById.get(requested.fieldId) : undefined;
  const selectedFieldId = selectedField?.id;
  const fieldOrders = selectedFieldId ? data.workOrders.filter((order) => order.fieldId === selectedFieldId) : data.workOrders;
  const visibleOrders = orderIssues(fieldOrders.filter((order) => matchesView(order, view, ctx.userId, now)), now);
  const countFor = (candidate: WorkOrderView) => fieldOrders.filter((order) => matchesView(order, candidate, ctx.userId, now)).length;
  const canWork = canOpenCloseField(ctx);
  const canManage = canManageVenueSettings(ctx);
  const fieldOptions = data.fields.map((field) => ({ id: field.id, name: field.name, venueName: venueById.get(field.venueId)?.name ?? "Venue" }));

  return (
    <PageShell size="wide">
      <PageTitle
        description="Turn a reported field issue into one accountable owner, one clear next step, and a visible resolution history."
        eyebrow="Field operations"
        title="Work Orders"
      />

      {selectedField ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-[var(--accent-soft)] p-4 text-sm font-bold text-[var(--accent-strong)] sm:flex-row sm:items-center sm:justify-between">
          <span>Showing work for {selectedField.name}</span>
          <div className="flex flex-wrap gap-3">
            <Link className="underline" href={`/admin/fields?fieldId=${encodeURIComponent(selectedField.id)}`}>Back to {selectedField.name}</Link>
            <Link className="underline" href="/admin/fields/work-orders">Show every field</Link>
          </div>
        </div>
      ) : (
        <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-[var(--accent-strong)] underline" href="/admin/fields">Back to Field Operations</Link>
      )}

      {data.errorMessage ? (
        <div className="mt-8"><ErrorState message={data.errorMessage} title="Unable to load work orders" /></div>
      ) : (
        <>
          {canWork && fieldOptions.length > 0 ? (
            <details className="group mt-6 rounded-xl border border-[var(--line)] bg-white shadow-sm">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-sm font-black text-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-5">
                Report a field issue <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-[var(--line)] p-4 sm:p-5">
                <WorkOrderForm fields={fieldOptions} initialFieldId={selectedField?.id} initialFieldName={selectedField?.name} />
              </div>
            </details>
          ) : null}

          <nav aria-label="Work order views" className="mt-6 flex flex-wrap gap-2 pb-2">
            {views.map((option) => (
              <Link
                aria-current={view === option.key ? "page" : undefined}
                className={`flex min-h-12 shrink-0 items-center rounded-full px-4 text-sm font-black ring-1 ring-inset ${view === option.key ? "bg-[var(--black-soft)] text-white ring-[var(--black-soft)]" : "bg-white ring-[var(--line)]"}`}
                href={viewHref(option.key, selectedField?.id)}
                key={option.key}
              >
                {option.label} ({countFor(option.key)})
              </Link>
            ))}
          </nav>

          {visibleOrders.length > 0 ? (
            <section aria-label={`${views.find((option) => option.key === view)?.label} work orders`} className="mt-4 grid gap-4 md:grid-cols-2">
              {visibleOrders.map((order) => {
                const field = order.fieldId ? fieldById.get(order.fieldId) : undefined;
                const venue = venueById.get(order.venueId);
                const fieldName = field?.name ?? "Venue-wide";
                const query = order.fieldId ? `?fieldId=${encodeURIComponent(order.fieldId)}` : "";
                return (
                  <WorkOrderCard
                    assigneeName={order.assignedToUserId ? data.assigneeById.get(order.assignedToUserId)?.displayName ?? "Venue teammate" : null}
                    assignees={data.people.filter((person) => person.venueIds.includes(order.venueId))}
                    canManage={canManage}
                    canWork={canWork}
                    currentUserId={ctx.userId}
                    detailHref={`/admin/fields/work-orders/${order.id}${query}`}
                    disruptionHref={order.fieldId ? `/admin/fields/${order.fieldId}/disruption` : null}
                    fieldHref={order.fieldId ? `/admin/fields?fieldId=${encodeURIComponent(order.fieldId)}` : "/admin/fields"}
                    fieldName={fieldName}
                    game={gameContext(order.gameId ? data.sessionsById.get(order.gameId) : undefined, venue)}
                    key={order.id}
                    now={now}
                    order={order}
                  />
                );
              })}
            </section>
          ) : (
            <EmptyState
              className="mt-6"
              message={view === "attention" ? "No unassigned, overdue, important, or urgent work needs a decision." : view === "mine" ? "You do not own any unresolved work orders." : view === "resolved" ? "No work orders have been resolved in this view." : "No unresolved work orders are open."}
              title={view === "attention" ? "Nothing needs attention" : "No work orders here"}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
