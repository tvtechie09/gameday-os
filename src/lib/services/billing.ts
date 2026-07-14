import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getOrganizations } from "@/lib/services/organizations";
import { resolveActingVenue } from "@/lib/services/venue-operations";
import { canManageBilling } from "@/lib/access/capabilities";
import type { AccessContext } from "@/lib/access/capabilities";
import {
  summarizeBilling,
  type BillingAccount,
  type BillingInterval,
  type BillingInvoice,
  type BillingSummary,
} from "@/lib/services/billing-core";

// Billing IO. Records what an organization is charged and whether it's paid —
// never processes payments. The plan + invoices are managed by GameDay staff
// (platform.billing.manage); a venue GM sees their own organization's numbers
// read-only. See docs/pricing-and-packaging.md.

export * from "@/lib/services/billing-core";

type AccountRow = {
  organization_id: string;
  plan_label: string;
  amount_cents: number;
  billing_interval: string;
  status: string;
  po_number: string | null;
  notes: string | null;
  updated_at: string;
};

type InvoiceRow = {
  id: string;
  organization_id: string;
  description: string;
  amount_cents: number;
  status: string;
  issued_on: string;
  due_on: string | null;
  paid_on: string | null;
  po_number: string | null;
};

function mapAccount(row: AccountRow): BillingAccount {
  return {
    organizationId: row.organization_id,
    planLabel: row.plan_label,
    amountCents: row.amount_cents,
    billingInterval: row.billing_interval === "year" ? "year" : "month",
    status: row.status === "paused" ? "paused" : "active",
    poNumber: row.po_number,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

function mapInvoice(row: InvoiceRow): BillingInvoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    description: row.description,
    amountCents: row.amount_cents,
    status: row.status === "paid" ? "paid" : row.status === "void" ? "void" : "open",
    issuedOn: row.issued_on,
    dueOn: row.due_on,
    paidOn: row.paid_on,
    poNumber: row.po_number,
  };
}

export type OrgBilling = {
  account: BillingAccount | null;
  invoices: BillingInvoice[];
  summary: BillingSummary;
};

export async function getBillingForOrg(organizationId: string): Promise<OrgBilling> {
  const supabase = getSupabaseAdminClient();
  const [accountResult, invoiceResult] = await Promise.all([
    supabase.from("billing_accounts").select("*").eq("organization_id", organizationId).maybeSingle(),
    supabase.from("billing_invoices").select("*").eq("organization_id", organizationId).order("issued_on", { ascending: false }),
  ]);
  if (accountResult.error) throw new Error(accountResult.error.message);
  if (invoiceResult.error) throw new Error(invoiceResult.error.message);
  const account = accountResult.data ? mapAccount(accountResult.data as AccountRow) : null;
  const invoices = ((invoiceResult.data ?? []) as InvoiceRow[]).map(mapInvoice);
  return { account, invoices, summary: summarizeBilling(account, invoices, Date.now()) };
}

// Which organization's billing does this user see, and may they manage it?
// Platform billing managers see any org (picker; requestedOrgId honored); an
// org/venue-scoped user sees only their own organization, read-only.
export type BillingScope = { organizationId: string | null; organizationName: string | null; canManage: boolean; organizations: Array<{ id: string; name: string }> };

export async function resolveBillingScope(ctx: AccessContext | null, requestedOrgId?: string): Promise<BillingScope> {
  const orgs = await getOrganizations().catch(() => []);
  const orgOptions = orgs.map((org) => ({ id: org.id, name: org.name }));

  if (canManageBilling(ctx)) {
    const chosen = (requestedOrgId && orgs.find((org) => org.id === requestedOrgId)) || orgs[0] || null;
    return { organizationId: chosen?.id ?? null, organizationName: chosen?.name ?? null, canManage: true, organizations: orgOptions };
  }

  // Viewer: resolve the acting user's own organization.
  let orgId: string | null = null;
  if (ctx?.scopeType === "organization" && ctx.scopeId) {
    orgId = ctx.scopeId;
  } else {
    const venue = await resolveActingVenue(ctx).catch(() => null);
    orgId = (venue as { organizationId?: string | null } | null)?.organizationId ?? null;
  }
  const org = orgId ? orgs.find((item) => item.id === orgId) ?? null : null;
  return { organizationId: org?.id ?? orgId, organizationName: org?.name ?? null, canManage: false, organizations: [] };
}

// ---- Management (platform.billing.manage only; callers must gate) -----------

export async function upsertBillingPlan(input: {
  organizationId: string;
  planLabel: string;
  amountCents: number;
  billingInterval: BillingInterval;
  status: "active" | "paused";
  poNumber?: string | null;
  notes?: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("billing_accounts").upsert({
    organization_id: input.organizationId,
    plan_label: input.planLabel.trim().slice(0, 120) || "Custom",
    amount_cents: Math.max(0, Math.round(input.amountCents)),
    billing_interval: input.billingInterval,
    status: input.status,
    po_number: input.poNumber?.trim().slice(0, 80) || null,
    notes: input.notes?.trim().slice(0, 1000) || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id" });
  if (error) throw new Error(error.message);
}

export async function issueInvoice(input: {
  organizationId: string;
  description: string;
  amountCents: number;
  dueOn?: string | null;
  poNumber?: string | null;
}): Promise<void> {
  if (!input.description.trim()) throw new Error("Invoice needs a description.");
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("billing_invoices").insert({
    organization_id: input.organizationId,
    description: input.description.trim().slice(0, 200),
    amount_cents: Math.max(0, Math.round(input.amountCents)),
    due_on: input.dueOn || null,
    po_number: input.poNumber?.trim().slice(0, 80) || null,
  });
  if (error) throw new Error(error.message);
}

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("billing_invoices")
    .update({ status: "paid", paid_on: new Date().toISOString().slice(0, 10) })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);
}

export async function setInvoiceStatus(invoiceId: string, status: "open" | "void"): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("billing_invoices")
    .update({ status, paid_on: null })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);
}
