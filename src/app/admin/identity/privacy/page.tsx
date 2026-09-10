import Link from "next/link";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { PageShell, PageTitle, buttonStyles } from "@/components/ui/gameday-ui";
import { buildPersonPrivacyScope } from "@/lib/services/privacy-controls";

export const dynamic = "force-dynamic";

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ personId?: string; organizationId?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !isPlatformAdmin(ctx) || ctx.isImpersonating) redirect(getRoleHome(ctx));
  const query = await searchParams;
  const personId = query.personId?.trim() ?? "";
  const organizationId = query.organizationId?.trim() ?? "";
  const scope = personId && organizationId ? await buildPersonPrivacyScope(personId, organizationId).catch(() => null) : null;

  return <PageShell size="default">
    <PageTitle eyebrow="Platform identity" title="Privacy scope" description="Generate a read-only export and preview dependencies. Erasure is disabled until policy and hosted acceptance are complete." />
    <form className="mt-6 grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 sm:grid-cols-2" method="get">
      <label className="grid gap-2 text-sm font-black">Canonical person ID<input className="ui-input min-h-11" defaultValue={personId} name="personId" required /></label>
      <label className="grid gap-2 text-sm font-black">Organization ID<input className="ui-input min-h-11" defaultValue={organizationId} name="organizationId" required /></label>
      <button className={buttonStyles("primary", "sm:col-span-2 sm:w-fit")} type="submit">Preview privacy scope</button>
    </form>
    {personId && organizationId && !scope ? <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-900" role="alert">No authorized person scope was found. IDs are not echoed in the error.</p> : null}
    {scope ? <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4 sm:p-5">
      <h2 className="text-xl font-black">Dependency preview</h2>
      <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{String(scope.person.display_name)} · {String(scope.person.status)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {scope.impact.detachable.map((item) => <div className="rounded-lg bg-[var(--background)] p-3" key={item.recordClass}><p className="font-black">{item.count}</p><p className="text-sm text-[var(--muted)]">{item.recordClass}</p></div>)}
        {scope.impact.retained.map((item) => <div className="rounded-lg bg-[var(--background)] p-3" key={item.recordClass}><p className="font-black">Retain {item.count}</p><p className="text-sm text-[var(--muted)]">{item.recordClass} · {item.reason}</p></div>)}
      </div>
      {scope.impact.destructiveExecutionAllowed === false ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">Erasure blocked</p><ul className="mt-2 list-disc pl-5">{scope.impact.blockers.map((blocker) => <li key={blocker}>{blocker.replaceAll("_", " ")}</li>)}</ul></div> : null}
      <Link className={buttonStyles("secondary", "mt-4 w-full sm:w-fit")} href={`/api/admin/privacy/export?${new URLSearchParams({ personId, organizationId })}`}>Download JSON export</Link>
    </section> : null}
  </PageShell>;
}
