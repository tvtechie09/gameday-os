import { redirect } from "next/navigation";
import { canManageBilling } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canManageBilling(ctx)) {
    redirect(getRoleHome(ctx));
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Admin · Platform</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Billing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Platform-only. Subscription plans, invoices, and payment methods live here. This screen is a placeholder for
          the billing integration.
        </p>
      </header>
      <div className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-6 text-sm font-semibold text-[var(--muted)]">
        No billing provider connected yet.
      </div>
    </div>
  );
}
