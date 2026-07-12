import Link from "next/link";
import { automationTemplates } from "@/lib/automation-engine";
import { AutomationTemplateMarketplace } from "./automation-template-marketplace";

export default function AutomationMarketplacePage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Approved templates</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Automation Template Marketplace</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
              Install internal GameDay OS automation templates with one guided setup. Templates are approved, scoped, permission checked, and audit logged server-side.
            </p>
          </div>
          <Link className="ui-button ui-button-secondary min-h-11" href="/admin/automations">
            Manage Workflows
          </Link>
        </div>
      </section>

      <AutomationTemplateMarketplace defaultActorUserId={process.env.NEXT_PUBLIC_GAMEDAY_ADMIN_ACTOR_USER_ID ?? ""} initialTemplates={automationTemplates} />
    </main>
  );
}
