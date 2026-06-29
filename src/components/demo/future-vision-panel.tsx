import type { FutureVisionItem } from "@/lib/demo/presentation";
import { splitFutureVisionItems } from "@/lib/demo/presentation";

function statusClass(status: FutureVisionItem["status"]) {
  const classes: Record<FutureVisionItem["status"], string> = {
    "foundation ready": "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    "future integration": "bg-sky-100 text-sky-950 ring-1 ring-sky-200",
    "partner opportunity": "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
    roadmap: "bg-slate-200 text-slate-900 ring-1 ring-slate-300",
  };

  return classes[status];
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function FutureVisionPanel({ items }: { items: FutureVisionItem[] }) {
  const grouped = splitFutureVisionItems(items);

  return (
    <section className="grid gap-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Current vs Future Clarity</p>
        <h2 className="mt-2 text-3xl font-black">What is real today, foundation-ready, and future partner work</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ClarityCard label="Demoed today" value="Venue map, family flow, tournament dashboard, operations dashboard, and simulated weather delay." />
          <ClarityCard label="Foundation-ready" value="Scoped venue model, play surfaces, alerts, score state, endpoint records, sponsorship, and audit-oriented operations." />
          <ClarityCard label="Future vendor work" value="Physical scoreboard, PA/audio, Cisco, Meraki, camera, weather, and tournament app integrations require approvals and implementation." />
        </div>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950">
          Vendor names in this panel describe integration targets only. No Meraki, Cisco Spaces, Daktronics, security camera, PA/audio, or weather automation integration is live in this demo.
        </p>
      </div>

      <VisionGroup items={grouped.architected} title="Architected / Foundation Ready" />
      <VisionGroup items={grouped.future} title="Future Roadmap and Integrations" />
      <VisionGroup items={grouped.partnerApproval} title="Partner or Vendor Approval Required" />
    </section>
  );
}

function ClarityCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-4">
      <p className="text-sm font-black">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{value}</p>
    </div>
  );
}

function VisionGroup({ items, title }: { items: FutureVisionItem[]; title: string }) {
  return (
    <div>
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={`${title}-${item.title}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-black">{item.title}</p>
              <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${statusClass(item.status)}`}>{titleCase(item.status)}</span>
            </div>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{item.category}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-[var(--background)] p-3">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">Value to venue</p>
                <p className="mt-2 text-sm font-semibold leading-6">{item.valueToVenue}</p>
              </div>
              {item.valueToFamiliesTournaments ? (
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">Value to families/tournaments</p>
                  <p className="mt-2 text-sm font-semibold leading-6">{item.valueToFamiliesTournaments}</p>
                </div>
              ) : null}
            </div>
            {item.requiresPartnerApproval ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">Requires partner/vendor approval before live integration.</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
