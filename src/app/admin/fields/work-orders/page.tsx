import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import { getWorkOrders, type WorkOrder } from "@/lib/services/work-orders";
import { setWorkOrderStatusAction } from "./actions";
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

function StatusActions({ order }: { order: WorkOrder }) {
  const next: Array<{ status: string; label: string }> =
    order.status === "open"
      ? [
          { status: "in_progress", label: "Start" },
          { status: "done", label: "Done" },
        ]
      : order.status === "in_progress"
        ? [{ status: "done", label: "Done" }]
        : [{ status: "open", label: "Reopen" }];
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

export default async function WorkOrdersPage() {
  let errorMessage: string | null = null;
  let orders: WorkOrder[] = [];
  let fieldOptions: Array<{ id: string; name: string; venueName: string }> = [];
  const fieldNameById = new Map<string, string>();

  try {
    const [venues, fields, workOrders] = await Promise.all([getVenues(), getFields(), getWorkOrders()]);
    const venueById = new Map(venues.map((venue) => [venue.id, venue]));
    fieldOptions = fields.map((field) => ({ id: field.id, name: field.name, venueName: venueById.get(field.venueId)?.name ?? "Venue" }));
    for (const field of fields) fieldNameById.set(field.id, field.name);
    orders = workOrders;
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load work orders.");
  }

  const openOrders = orders.filter((order) => order.status !== "done");
  const doneOrders = orders.filter((order) => order.status === "done").slice(0, 20);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Fields</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Field work orders</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Log maintenance issues against a field and track them to done. Urgent items are for
        anything that makes a field unusable.
      </p>
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
          <WorkOrderForm fields={fieldOptions} />

          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-black">Open ({openOrders.length})</h2>
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
                            {order.status === "in_progress" ? "In progress" : "Open"}
                          </span>
                        </div>
                        <h3 className="mt-2 font-black">{fieldNameById.get(order.fieldId) ?? "Field"} — {order.title}</h3>
                        {order.detail ? <p className="mt-1 text-sm text-[var(--muted)]">{order.detail}</p> : null}
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          {formatCreatedAt(order.createdAt)}
                          {order.reportedBy ? ` · reported by ${order.reportedBy}` : ""}
                        </p>
                      </div>
                      <StatusActions order={order} />
                    </div>
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
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2 last:border-0">
                    <span>
                      <span className="font-bold">{fieldNameById.get(order.fieldId) ?? "Field"}</span> — {order.title}
                    </span>
                    <StatusActions order={order} />
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
