import { redirect } from "next/navigation";
import { canManageBilling, canViewBilling } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { getBillingForOrg, resolveBillingScope, type BillingInvoice } from "@/lib/services/billing";
import { issueInvoiceAction, markInvoicePaidAction, setInvoiceStatusAction, setPlanAction } from "./actions";

export const dynamic = "force-dynamic";

const usd = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z")) : "—");

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <p className={`text-2xl font-black leading-none ${tone ?? "text-[var(--foreground)]"}`}>{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

const invoiceBadge: Record<BillingInvoice["status"], string> = {
  paid: "bg-emerald-500/15 text-emerald-700",
  open: "bg-amber-500/20 text-amber-800",
  void: "bg-slate-500/10 text-slate-500 line-through",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewBilling(ctx)) redirect(getRoleHome(ctx));

  const { org: requestedOrg } = await searchParams;
  const scope = await resolveBillingScope(ctx, requestedOrg);
  const manage = scope.canManage && canManageBilling(ctx);

  if (!scope.organizationId) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-black">Billing</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">No organization is associated with your account yet.</p>
      </div>
    );
  }

  const { account, invoices, summary } = await getBillingForOrg(scope.organizationId);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Billing</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">{scope.organizationName ?? "Your organization"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Your GameDay plan and invoices. Billed by invoice / PO — GameDay does not process card payments.
          </p>
        </div>
        {manage && scope.organizations.length > 1 ? (
          <form method="get" className="flex items-end gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">Organization</span>
              <select name="org" defaultValue={scope.organizationId} className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold">
                {scope.organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <button className="min-h-10 rounded-lg bg-[var(--black-soft)] px-3 text-sm font-black text-white" type="submit">View</button>
          </form>
        ) : null}
      </header>

      {/* Plan + summary */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Plan</p>
          <p className="mt-1 text-lg font-black text-[var(--foreground)]">{summary.planLabel}</p>
          {summary.hasPlan ? (
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {usd(summary.amountCents)}/{summary.billingInterval}
              {summary.status === "paused" ? " · paused" : ""}
            </p>
          ) : <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Not set yet.</p>}
        </div>
        <Tile label="Per year" value={summary.hasPlan ? usd(summary.annualizedCents) : "—"} />
        <Tile label="Outstanding" value={usd(summary.outstandingCents)} tone={summary.outstandingCents > 0 ? "text-amber-700" : "text-emerald-600"} />
        <Tile label="Paid (last 12 mo)" value={usd(summary.paidLast12moCents)} tone="text-emerald-600" />
      </section>

      {summary.overdueCount > 0 ? (
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-800">
          {summary.overdueCount} invoice{summary.overdueCount === 1 ? "" : "s"} overdue — {usd(summary.overdueCents)} past due.
        </p>
      ) : null}

      {/* Invoices */}
      <section className="mt-7">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Invoices</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--background)] text-left text-[11px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Issued</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Status</th>
                {manage ? <th className="px-4 py-2">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={manage ? 6 : 5} className="px-4 py-4 text-sm font-semibold text-[var(--muted)]">No invoices yet.</td></tr>
              ) : invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-2 font-bold text-[var(--foreground)]">{invoice.description}{invoice.poNumber ? <span className="ml-2 text-xs font-semibold text-[var(--muted)]">PO {invoice.poNumber}</span> : null}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{dateLabel(invoice.issuedOn)}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{dateLabel(invoice.dueOn)}</td>
                  <td className="px-4 py-2 text-right font-black">{usd(invoice.amountCents)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${invoiceBadge[invoice.status]}`}>{invoice.status}</span>
                    {invoice.status === "paid" && invoice.paidOn ? <span className="ml-2 text-xs font-semibold text-[var(--muted)]">{dateLabel(invoice.paidOn)}</span> : null}
                  </td>
                  {manage ? (
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        {invoice.status !== "paid" ? (
                          <form action={markInvoicePaidAction}><input type="hidden" name="invoice_id" value={invoice.id} /><button className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-black text-white" type="submit">Mark paid</button></form>
                        ) : (
                          <form action={setInvoiceStatusAction}><input type="hidden" name="invoice_id" value={invoice.id} /><input type="hidden" name="status" value="open" /><button className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs font-bold" type="submit">Unpay</button></form>
                        )}
                        {invoice.status !== "void" ? (
                          <form action={setInvoiceStatusAction}><input type="hidden" name="invoice_id" value={invoice.id} /><input type="hidden" name="status" value="void" /><button className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs font-bold text-[var(--muted)]" type="submit">Void</button></form>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Management (GameDay staff only) */}
      {manage ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <form action={setPlanAction} className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <input type="hidden" name="organization_id" value={scope.organizationId} />
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Set plan</p>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Plan label</span><input name="plan_label" defaultValue={account?.planLabel ?? "Complex"} className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Amount ($)</span><input name="amount" defaultValue={account ? (account.amountCents / 100).toString() : ""} placeholder="1500" className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
              <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Interval</span>
                <select name="billing_interval" defaultValue={account?.billingInterval ?? "month"} className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold"><option value="month">per month</option><option value="year">per year</option></select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Status</span>
                <select name="status" defaultValue={account?.status ?? "active"} className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold"><option value="active">active</option><option value="paused">paused</option></select>
              </label>
              <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">PO number</span><input name="po_number" defaultValue={account?.poNumber ?? ""} className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            </div>
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">Save plan</button>
          </form>

          <form action={issueInvoiceAction} className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <input type="hidden" name="organization_id" value={scope.organizationId} />
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Issue an invoice</p>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Description</span><input name="description" placeholder="Complex plan — Aug 2026" required className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Amount ($)</span><input name="amount" placeholder="1500" required className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
              <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Due date</span><input name="due_on" type="date" className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            </div>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">PO number (optional)</span><input name="po_number" className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <button className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">Issue invoice</button>
          </form>
        </section>
      ) : (
        <p className="mt-8 rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-4 text-sm font-semibold text-[var(--muted)]">
          Questions about your plan or an invoice? Contact your GameDay account manager — they manage billing on your behalf.
        </p>
      )}
    </div>
  );
}
