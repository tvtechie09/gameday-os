// Billing math (pure, dependency-free). GameDay records what an organization is
// charged; this rolls a plan + invoices into the numbers a customer wants to see
// — what they pay per month/year, what's outstanding, what they've paid. No
// payment processing anywhere. See docs/pricing-and-packaging.md.

export type BillingInterval = "month" | "year";

export type BillingAccount = {
  organizationId: string;
  planLabel: string;
  amountCents: number;
  billingInterval: BillingInterval;
  status: "active" | "paused";
  poNumber: string | null;
  notes: string | null;
  updatedAt: string;
};

export type InvoiceStatus = "open" | "paid" | "void";

export type BillingInvoice = {
  id: string;
  organizationId: string;
  description: string;
  amountCents: number;
  status: InvoiceStatus;
  issuedOn: string; // YYYY-MM-DD
  dueOn: string | null;
  paidOn: string | null;
  poNumber: string | null;
};

export type BillingSummary = {
  hasPlan: boolean;
  planLabel: string;
  amountCents: number;
  billingInterval: BillingInterval;
  status: "active" | "paused";
  monthlyCents: number;
  annualizedCents: number;
  outstandingCents: number;
  overdueCents: number;
  overdueCount: number;
  paidLast12moCents: number;
  openInvoiceCount: number;
  nextDueOn: string | null;
};

export function annualizedCents(amountCents: number, interval: BillingInterval): number {
  return interval === "year" ? amountCents : amountCents * 12;
}

export function monthlyCents(amountCents: number, interval: BillingInterval): number {
  return interval === "month" ? amountCents : Math.round(amountCents / 12);
}

function isoDaysAgo(now: number, days: number): string {
  return new Date(now - days * 86_400_000).toISOString().slice(0, 10);
}

export function summarizeBilling(account: BillingAccount | null, invoices: BillingInvoice[], now: number): BillingSummary {
  const today = new Date(now).toISOString().slice(0, 10);
  const cutoff = isoDaysAgo(now, 365);

  const open = invoices.filter((invoice) => invoice.status === "open");
  const overdue = open.filter((invoice) => invoice.dueOn !== null && invoice.dueOn < today);
  const paidRecent = invoices.filter((invoice) => invoice.status === "paid" && (invoice.paidOn ?? invoice.issuedOn) >= cutoff);

  const nextDueOn = open
    .map((invoice) => invoice.dueOn)
    .filter((due): due is string => due !== null)
    .sort()[0] ?? null;

  const interval = account?.billingInterval ?? "month";
  const amount = account?.amountCents ?? 0;

  return {
    hasPlan: Boolean(account),
    planLabel: account?.planLabel ?? "No plan set",
    amountCents: amount,
    billingInterval: interval,
    status: account?.status ?? "active",
    monthlyCents: account ? monthlyCents(amount, interval) : 0,
    annualizedCents: account ? annualizedCents(amount, interval) : 0,
    outstandingCents: open.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    overdueCents: overdue.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    overdueCount: overdue.length,
    paidLast12moCents: paidRecent.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    openInvoiceCount: open.length,
    nextDueOn,
  };
}
