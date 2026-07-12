import Link from "next/link";
import { automationTemplates } from "@/lib/automation-engine";
import { AutomationConsole } from "./automation-console";

export default function AdminAutomationsPage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Admin-only</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Automation Engine</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
              Enable approved Phase 1 workflows for weather delays, field closures, game finals, and schedule changes. Runs are scoped, permission checked, and audit logged server-side.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="ui-button ui-button-primary min-h-11" href="/admin/automations/marketplace">Open Template Marketplace</Link>
            <span className="inline-flex min-h-11 items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
              {automationTemplates.length} templates ready
            </span>
          </div>
        </div>
      </section>

      <AutomationConsole defaultActorUserId={process.env.NEXT_PUBLIC_GAMEDAY_ADMIN_ACTOR_USER_ID ?? ""} initialTemplates={automationTemplates} />
    </main>
  );
}
