import Link from "next/link";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { PageShell, PageTitle, buttonStyles } from "@/components/ui/gameday-ui";
import { previewLegacyIdentityReconciliation } from "@/lib/services/legacy-identity-reconciliation";

export const dynamic = "force-dynamic";

export default async function LegacyReconciliationPage({ searchParams }: { searchParams: Promise<{ stateId?: string; page?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !isPlatformAdmin(ctx) || ctx.isImpersonating) redirect(getRoleHome(ctx));
  const query = await searchParams;
  const stateId = query.stateId?.trim() ?? "";
  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const preview = stateId ? await previewLegacyIdentityReconciliation(stateId, page).catch(() => null) : null;
  return <PageShell size="wide">
    <PageTitle eyebrow="Platform identity" title="Legacy reconciliation preview" description="Classify a bounded Team/Family batch without changing canonical or legacy identity." />
    <form className="mt-6 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-end" method="get"><label className="grid flex-1 gap-2 text-sm font-black">Exact Team state ID<input className="ui-input min-h-11" defaultValue={stateId} name="stateId" required /></label><button className={buttonStyles("primary")} type="submit">Generate preview</button></form>
    {stateId && !preview ? <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-900" role="alert">Preview unavailable. Confirm the exact state mapping and staging schema.</p> : null}
    {preview ? <>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(preview.counts).map(([label, count]) => <div className="rounded-xl border border-[var(--line)] bg-white p-4" key={label}><p className="text-2xl font-black">{count}</p><p className="mt-1 break-words text-xs font-bold uppercase text-[var(--muted)]">{label.replaceAll("_", " ")}</p></div>)}</section>
      {!preview.organizationId ? <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">No explicit state-to-organization mapping exists. Every row is blocked; GameDay will not guess from names.</p> : null}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Person-level evidence</h2><p className="text-sm text-[var(--muted)]">Identifiers are masked. Names are not used as matching evidence.</p></div><Link className={buttonStyles("secondary")} href={`/api/admin/identity/reconciliation/preview?${new URLSearchParams({ stateId, page: String(page) })}`}>Download manifest</Link></div><div className="mt-4 grid gap-3">{preview.decisions.map((decision) => <article className="rounded-lg bg-[var(--background)] p-4" key={decision.legacyPersonId}><div className="flex flex-wrap justify-between gap-2"><p className="font-black">Legacy {decision.legacyPersonId}</p><span className="rounded-md bg-white px-2 py-1 text-xs font-black">{decision.classification.replaceAll("_", " ")}</span></div><p className="mt-2 text-sm font-semibold text-[var(--muted)]">{decision.legacyType} · {decision.source} · {decision.maskedEmail} · {decision.maskedPhone}</p><p className="mt-1 text-xs text-[var(--muted)]">Reason {decision.reasonCode} · relationships {decision.relationshipProjectionCount} · {decision.fingerprint}</p></article>)}</div></section>
      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">Execution is disabled. This preview creates no review cases, people, relationships, mappings, or queue items.</div>
    </> : null}
  </PageShell>;
}
