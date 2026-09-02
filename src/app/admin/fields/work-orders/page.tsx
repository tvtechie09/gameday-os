import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getWorkOrders, type WorkOrder } from "@/lib/services/work-orders";
import { issueLifecycle, issueStageLabel, orderIssues, rollupIssues } from "@/lib/services/work-order-core";
import { acknowledgeWorkOrderAction, assignWorkOrderAction, resolveWorkOrderAction, setWorkOrderStatusAction, startWorkOrderAction } from "./actions";
import { WorkOrderForm } from "./work-order-form";

export const dynamic = "force-dynamic";

const PRIORITY_CLASSES: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-amber-100 text-amber-900",
  normal: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  low: "bg-gray-100 text-gray-700",
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// Accountability row: who owns it, whether anyone has confirmed they're on it,
// and when it's due. This is the part a computed attention queue can't express —
// without it, an issue can sit in the queue all day with nobody knowing if it's
// been picked up.
function LifecycleControls({ order, now }: { order: WorkOrder; now: number }) {
  const life = issueLifecycle(order, now);
  if (life.stage === "resolved") {
    return order.resolutionNotes ? <p className="mt-2 text-xs text-[var(--muted)]">Resolved: {order.resolutionNotes}</p> : null;
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{issueStageLabel(life.stage)}</span>
        {order.assignedRole ? <span className="rounded-md bg-[var(--background)] px-2 py-0.5 font-bold">{order.assignedRole}</span> : null}
        {life.unowned ? <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800">Nobody assigned</span> : null}
        {life.unacknowledged ? <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800">Not acknowledged</span> : null}
        {life.isOverdue ? <span className="rounded-md bg-red-50 px-2 py-0.5 font-bold text-red-800">Overdue {Math.abs(life.minutesUntilDue ?? 0)} min</span> : null}
        {!life.isOverdue && life.minutesUntilDue !== null ? (
          <span className="text-[var(--muted)]">Due in {life.minutesUntilDue} min</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <form action={assignWorkOrderAction} className="grid gap-2 sm:flex sm:flex-wrap sm:items-end">
          <input name="id" type="hidden" value={order.id} />
          <label className="grid gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">Assign to</span>
            <input
              className="min-h-12 w-full rounded-lg border border-[var(--line)] px-3 text-sm font-semibold sm:w-36"
              defaultValue={order.assignedRole ?? ""}
              name="assigned_role"
              placeholder="grounds crew"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">Due</span>
            <input className="min-h-12 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="due_at" type="datetime-local" />
          </label>
          <button className="min-h-12 rounded-lg border border-[var(--line)] px-4 text-sm font-bold" type="submit">
            Save
          </button>
        </form>

        {!order.acknowledgedAt ? (
          <form action={acknowledgeWorkOrderAction} className="w-full sm:w-auto">
            <input name="id" type="hidden" value={order.id} />
            <button className="min-h-12 w-full rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white" type="submit">
              I&apos;m on it
            </button>
          </form>
        ) : null}

        {life.stage !== "in_progress" ? (
          <form action={startWorkOrderAction} className="w-full sm:w-auto">
            <input name="id" type="hidden" value={order.id} />
            <button className="min-h-12 w-full rounded-lg border border-[var(--line)] px-4 text-sm font-bold" type="submit">Start work</button>
          </form>
        ) : null}

        <form action={resolveWorkOrderAction} className="grid gap-2 sm:flex sm:flex-wrap sm:items-end">
          <input name="id" type="hidden" value={order.id} />
          <label className="grid gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">Resolution</span>
            <input
              className="min-h-12 w-full rounded-lg border border-[var(--line)] px-3 text-sm font-semibold sm:w-44"
              name="resolution_notes"
              placeholder="what fixed it"
            />
          </label>
          <button className="min-h-12 rounded-lg border border-[var(--line)] px-4 text-sm font-bold" type="submit">
            Resolve
          </button>
        </form>
      </div>
    </div>
  );
}

function StatusActions({ order }: { order: WorkOrder }) {
  const resolved = order.status === "resolved" || order.status === "done" || Boolean(order.closedAt);
  const next: Array<{ status: string; label: string }> = resolved
    ? [{ status: "open", label: "Reopen" }]
    : [{ status: "resolved", label: "Resolve" }];
  return (
    <div className="flex gap-2">
      {next.map((option) => (
        <form action={setWorkOrderStatusAction} key={option.status}>
          <input name="id" type="hidden" value={order.id} />
          <input name="status" type="hidden" value={option.status} />
          <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-bold" type="submit">
            {option.label}
          </button>
        </form>
      ))}
    </div>
  );
}

// Load + derive outside the component. The lifecycle math needs the current
// time, and reading the clock in a component body is impure (same reason
// buildCommandCenter timestamps inside the service, not the page).
async function loadIssueBoard(requestedFieldId?: string) {
  const now = Date.now();
  const fieldNameById = new Map<string, string>();
  try {
    const [scoped, workOrders] = await Promise.all([getScopedVenuesAndFields(), getWorkOrders()]);
    const venueById = new Map(scoped.venues.map((venue) => [venue.id, venue]));
    const fieldOptions = scoped.fields.map((field) => ({ id: field.id, name: field.name, venueName: venueById.get(field.venueId)?.name ?? "Venue" }));
    for (const field of scoped.fields) fieldNameById.set(field.id, field.name);
    // Confine field and venue-wide issues to in-scope venues.
    const fieldIds = new Set(scoped.fields.map((field) => field.id));
    const venueIds = new Set(scoped.venues.map((venue) => venue.id));
    const selectedFieldId = requestedFieldId && fieldIds.has(requestedFieldId) ? requestedFieldId : undefined;
    const scopedOrders = workOrders.filter((order) => venueIds.has(order.venueId) || (order.fieldId !== null && fieldIds.has(order.fieldId)));
    const orders = selectedFieldId ? scopedOrders.filter((order) => order.fieldId === selectedFieldId) : scopedOrders;

    return {
      errorMessage: null as string | null,
      now,
      fieldOptions,
      fieldNameById,
      selectedFieldId,
      // Ranked by what most needs a decision (overdue, then priority, then
      // unowned) rather than newest-first, so the forgotten item rises.
      openOrders: orderIssues(orders.filter((order) => order.status !== "done" && order.status !== "resolved" && !order.closedAt), now),
      doneOrders: orders.filter((order) => order.status === "done" || order.status === "resolved" || Boolean(order.closedAt)).slice(0, 20),
      rollup: rollupIssues(orders, now),
    };
  } catch (error) {
    return {
      errorMessage: publicErrorMessage(error, "Unable to load work orders."),
      now,
      fieldOptions: [] as Array<{ id: string; name: string; venueName: string }>,
      fieldNameById,
      selectedFieldId: undefined as string | undefined,
      openOrders: [] as WorkOrder[],
      doneOrders: [] as WorkOrder[],
      rollup: rollupIssues([], now),
    };
  }
}

export default async function WorkOrdersPage({ searchParams }: { searchParams?: Promise<{ fieldId?: string }> }) {
  const requestedFieldId = (await searchParams)?.fieldId;
  const { errorMessage, now, fieldOptions, fieldNameById, openOrders, doneOrders, rollup, selectedFieldId } = await loadIssueBoard(requestedFieldId);
  const selectedFieldName = selectedFieldId ? fieldNameById.get(selectedFieldId) : null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Fields</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Field work orders</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Log maintenance issues against a field and track them to done. Urgent items are for
        anything that makes a field unusable.
      </p>
      {selectedFieldName ? <p className="mt-3 rounded-lg bg-[var(--accent-soft)] p-3 text-sm font-bold text-[var(--accent-strong)]">Showing issues for {selectedFieldName}. <Link className="underline" href="/admin/fields/work-orders">Show all fields</Link></p> : null}
      <p className="mt-2 text-sm">
        <Link className="font-bold text-[var(--accent-strong)] underline" href="/admin/fields">
          Back to Fields
        </Link>
      </p>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          <WorkOrderForm fields={fieldOptions} initialFieldId={selectedFieldId} />

          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-black">Open ({openOrders.length})</h2>
              <p className="text-xs font-bold text-[var(--muted)]">
                {rollup.unowned} unassigned · {rollup.acknowledged + rollup.inProgress} being worked
                {rollup.overdue > 0 ? <span className="text-red-700"> · {rollup.overdue} overdue</span> : null}
              </p>
            </div>
            {openOrders.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Nothing open. Fields are in good shape.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {openOrders.map((order) => (
                  <article key={order.id} className="rounded-lg border border-[var(--line)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={"rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.1em] " + (PRIORITY_CLASSES[order.priority] ?? PRIORITY_CLASSES.normal)}>
                            {order.priority}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                            {issueStageLabel(issueLifecycle(order, now).stage)}
                          </span>
                        </div>
                        <h3 className="mt-2 font-black">{order.fieldId ? fieldNameById.get(order.fieldId) ?? "Field" : "Venue-wide"} — {order.title}</h3>
                        {order.detail ? <p className="mt-1 text-sm text-[var(--muted)]">{order.detail}</p> : null}
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          {formatCreatedAt(order.createdAt)}
                          {order.reportedBy ? ` · reported by ${order.reportedBy}` : ""}
                        </p>
                      </div>
                      <StatusActions order={order} />
                    </div>
                    <LifecycleControls now={now} order={order} />
                  </article>
                ))}
              </div>
            )}
          </section>

          {doneOrders.length > 0 ? (
            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Recently completed</h2>
              <ul className="mt-3 grid gap-2 text-sm">
                {doneOrders.map((order) => (
                  <li key={order.id} className="border-b border-[var(--line)] pb-2 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-bold">{order.fieldId ? fieldNameById.get(order.fieldId) ?? "Field" : "Venue-wide"}</span> — {order.title}
                      </span>
                      <StatusActions order={order} />
                    </div>
                    {/* Show HOW it was closed — an unexplained "done" is unauditable,
                        which is the whole reason resolution notes exist. */}
                    {order.resolutionNotes ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">Resolved: {order.resolutionNotes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}
