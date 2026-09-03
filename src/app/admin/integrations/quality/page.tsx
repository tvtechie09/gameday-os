import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Database, History, Link2, ShieldCheck } from "lucide-react";
import { resolveSession } from "@/lib/access/session";
import { getIntegrationDataQualityDashboard } from "@/lib/services/integration-data-quality";
import { resolveProviderConflictAction, reviewProviderMappingAction } from "./actions";

export const dynamic = "force-dynamic";

function dateLabel(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function healthClass(health: string) {
  if (health === "HEALTHY") return "bg-emerald-100 text-emerald-900";
  if (health === "STALE" || health === "DEGRADED") return "bg-amber-100 text-amber-900";
  if (health === "ERROR") return "bg-red-100 text-red-900";
  return "bg-slate-200 text-slate-800";
}

function safeValue(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return (text || "Not supplied").slice(0, 240);
}

export default async function IntegrationQualityPage() {
  const session = await resolveSession();
  if (session.kind !== "active") redirect("/login?next=/admin/integrations/quality");
  const dashboard = await getIntegrationDataQualityDashboard(session.context.userId);
  const openConflicts = dashboard.conflicts.filter((conflict) => conflict.resolution_state === "OPEN");

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <header className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
      <Link className="inline-flex items-center gap-2 text-sm font-black text-[var(--accent-strong)]" href="/admin/integrations"><ArrowLeft className="h-4 w-4" />Integration framework</Link>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Admin only</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Provider health &amp; data quality</h1>
      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">One canonical view of provider freshness, sync history, conflicts, duplicate candidates, and identity mappings. Family users never see these engineering details.</p>
    </header>

    <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Open conflicts" value={dashboard.totals.openConflicts} note={`${dashboard.totals.criticalConflicts} critical`} />
      <Metric label="Stale integrations" value={dashboard.totals.staleIntegrations} note="Cadence-aware" />
      <Metric label="Mapping reviews" value={dashboard.totals.mappingReviews} note="Human approval needed" />
      <Metric label="Duplicate candidates" value={dashboard.totals.duplicateCandidates} note="Never auto-merged when uncertain" />
    </section>

    <section className="mt-5 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2"><Database className="h-5 w-5" /><h2 className="text-xl font-black">Provider health</h2></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {dashboard.providers.map((provider) => <article className="min-w-0 rounded-xl border border-[var(--line)] p-4" key={provider.key}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-lg font-black">{provider.name}</h3><p className="break-words text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{provider.mode} · {provider.apiSupportState}</p></div><span className={`rounded-full px-2 py-1 text-xs font-black ${healthClass(provider.health)}`}>{provider.health}</span></div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2"><Stat label="Last successful" value={dateLabel(provider.lastSuccessfulSyncAt)} /><Stat label="Last attempted" value={dateLabel(provider.lastAttemptedSyncAt)} /><Stat label="Conflicts" value={String(provider.conflictCount)} /><Stat label="Stale records" value={String(provider.staleRecords)} /></dl>
          {provider.mostRecentError ? <details className="mt-3 rounded-lg bg-red-50 p-3"><summary className="cursor-pointer text-sm font-black text-red-900">Most recent error</summary><p className="mt-2 break-words text-sm font-semibold text-red-800">{provider.mostRecentError.slice(0, 300)}</p></details> : null}
        </article>)}
      </div>
    </section>

    <section className="mt-5 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /><h2 className="text-xl font-black">Conflict review</h2></div>
      <div className="mt-4 grid gap-3">
        {openConflicts.length ? openConflicts.map((conflict) => <article className="rounded-xl border border-[var(--line)] p-4" key={conflict.id}>
          <div className="flex flex-wrap items-center gap-2"><span className={conflict.severity === "CRITICAL" ? "rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-900" : "rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-900"}>{conflict.severity}</span><strong className="break-words">{conflict.entity_type} · {conflict.field_name}</strong></div>
          <div className="mt-3 grid gap-3 md:grid-cols-3"><Stat label={conflict.provider_a} value={safeValue(conflict.provider_a_value)} /><Stat label={conflict.provider_b} value={safeValue(conflict.provider_b_value)} /><Stat label="Current canonical" value={safeValue(conflict.canonical_value)} /></div>
          <form action={resolveProviderConflictAction} className="mt-4 flex flex-wrap gap-2"><input name="conflict_id" type="hidden" value={conflict.id} /><button className="ui-button ui-button-primary min-h-11" name="action" value="keep_current">Keep current</button><button className="ui-button ui-button-secondary min-h-11" name="action" value="choose_provider_a">Choose {conflict.provider_a}</button><button className="ui-button ui-button-secondary min-h-11" name="action" value="choose_provider_b">Choose {conflict.provider_b}</button><button className="ui-button ui-button-secondary min-h-11" name="action" value="ignore">Ignore</button></form>
        </article>) : <Empty icon={<CheckCircle2 className="h-5 w-5" />} text="No open provider conflicts." />}
      </div>
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-2">
      <article className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><Link2 className="h-5 w-5" /><h2 className="text-xl font-black">Mapping review</h2></div><div className="mt-4 grid gap-3">{dashboard.mappingReviews.length ? dashboard.mappingReviews.map((mapping) => <div className="rounded-lg border border-[var(--line)] p-3" key={mapping.id}><strong className="break-words">{mapping.provider_key}: {mapping.external_label || mapping.external_id}</strong><p className="mt-1 text-sm font-semibold text-[var(--muted)]">{mapping.mapping_type} → {mapping.internal_resource_type}</p><form action={reviewProviderMappingAction} className="mt-3 flex flex-wrap gap-2"><input name="mapping_id" type="hidden" value={mapping.id} /><button className="ui-button ui-button-primary min-h-11" name="action" value="approve">Approve mapping</button><button className="ui-button ui-button-secondary min-h-11" name="action" value="reject">Keep separate</button></form></div>) : <Empty icon={<ShieldCheck className="h-5 w-5" />} text="No identity mappings need review." />}</div></article>
      <article className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><History className="h-5 w-5" /><h2 className="text-xl font-black">Sync history</h2></div><div className="mt-4 grid gap-3">{dashboard.syncHistory.length ? dashboard.syncHistory.slice(0, 12).map((run) => <details className="rounded-lg border border-[var(--line)] p-3" key={run.id}><summary className="cursor-pointer text-sm font-black">{run.provider_key || "provider"} · {run.run_status} · {dateLabel(run.started_at)}</summary><div className="mt-3 grid gap-2 sm:grid-cols-2"><Stat label="Received" value={String(run.entities_received)} /><Stat label="Created / updated" value={`${run.records_created} / ${run.records_updated}`} /><Stat label="Unchanged" value={String(run.records_unchanged)} /><Stat label="Conflicts / duplicates" value={`${run.conflicts_detected} / ${run.duplicate_candidates}`} /><Stat label="Canonical changes" value={String(run.canonical_changes_emitted)} /><Stat label="Duration" value={run.duration_ms == null ? "Not measured" : `${run.duration_ms} ms`} /></div>{run.error_message ? <p className="mt-3 break-words text-sm font-semibold text-red-800">{run.error_message.slice(0, 300)}</p> : null}</details>) : <Empty icon={<History className="h-5 w-5" />} text="No normalized sync history yet." />}</div></article>
    </section>
  </main>;
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) { return <article className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-1 text-sm font-semibold text-[var(--muted)]">{note}</p></article>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-lg bg-[var(--background)] p-3"><dt className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-black">{value}</dd></div>; }
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--line)] p-4 text-sm font-bold text-[var(--muted)]">{icon}{text}</div>; }
