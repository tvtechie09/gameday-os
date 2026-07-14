"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/access/session";
import { canManageBilling } from "@/lib/access/capabilities";
import { issueInvoice, markInvoicePaid, setInvoiceStatus, upsertBillingPlan } from "@/lib/services/billing";

// Only GameDay billing staff may write. A venue GM's view is read-only.
async function requireBillingManager() {
  const ctx = await getSessionContext();
  if (!canManageBilling(ctx)) throw new Error("Not authorized to manage billing.");
  return ctx;
}

function dollarsToCents(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function setPlanAction(formData: FormData): Promise<void> {
  await requireBillingManager();
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!organizationId) return;
  await upsertBillingPlan({
    organizationId,
    planLabel: String(formData.get("plan_label") ?? "Custom"),
    amountCents: dollarsToCents(String(formData.get("amount") ?? "0")),
    billingInterval: String(formData.get("billing_interval") ?? "month") === "year" ? "year" : "month",
    status: String(formData.get("status") ?? "active") === "paused" ? "paused" : "active",
    poNumber: String(formData.get("po_number") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/admin/billing");
}

export async function issueInvoiceAction(formData: FormData): Promise<void> {
  await requireBillingManager();
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!organizationId) return;
  await issueInvoice({
    organizationId,
    description: String(formData.get("description") ?? ""),
    amountCents: dollarsToCents(String(formData.get("amount") ?? "0")),
    dueOn: String(formData.get("due_on") ?? "").trim() || null,
    poNumber: String(formData.get("po_number") ?? ""),
  });
  revalidatePath("/admin/billing");
}

export async function markInvoicePaidAction(formData: FormData): Promise<void> {
  await requireBillingManager();
  const id = String(formData.get("invoice_id") ?? "").trim();
  if (id) await markInvoicePaid(id);
  revalidatePath("/admin/billing");
}

export async function setInvoiceStatusAction(formData: FormData): Promise<void> {
  await requireBillingManager();
  const id = String(formData.get("invoice_id") ?? "").trim();
  const status = String(formData.get("status") ?? "open") === "void" ? "void" : "open";
  if (id) await setInvoiceStatus(id, status);
  revalidatePath("/admin/billing");
}
