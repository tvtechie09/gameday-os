import Link from "next/link";
import { redirect } from "next/navigation";
import { canManagePlatform, isPlatformAdmin } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { getPublicVenueUrl } from "@/lib/public-url";
import { getDemoTenantReadiness, summarizeClientReadiness } from "@/lib/services/client-readiness";
import { prepareReferenceDemoAction, refreshReferenceDemoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DemoReadinessPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || (!isPlatformAdmin(ctx) && !canManagePlatform(ctx))) redirect(getRoleHome(ctx));
  const sp = await searchParams;
  const demos = await getDemoTenantReadiness(ctx).catch((error) => { console.error("Failed to load demo readiness", error); return []; });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Client readiness</p><h1 className="mt-1 text-3xl font-black">Reference venue demo</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Prepare one disposable tenant, verify the buyer story, and reset the operating day without touching a real customer.</p></div>
        <div className="flex flex-wrap gap-2"><form action={refreshReferenceDemoAction}><button className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">Refresh demo day</button></form><Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href="/admin/onboarding">Create or remove demos</Link></div>
      </header>

      {sp.message ? <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{sp.message}</p> : null}
      {sp.error ? <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-900">{sp.error}</p> : null}

      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-xl font-black">The 15-minute buyer story</h2><ol className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">{["Import and understand the day", "See delays before families complain", "Publish one confirmed change", "Scan the parent QR experience", "Show sponsor delivery evidence", "Close with the operating report and pilot ask"].map((step, index) => <li className="flex gap-3" key={step}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--background)] text-xs font-black">{index + 1}</span><span className="font-semibold">{step}</span></li>)}</ol></section>

      {demos.length === 0 ? (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6"><h2 className="text-xl font-black text-amber-950">No disposable demo tenant found</h2><p className="mt-2 text-sm text-amber-900">Create a venue through onboarding and mark it as a demo. Real tenants can never be prepared or removed from this workflow.</p></section>
      ) : (
        <section className="mt-6 grid gap-5">{demos.map((demo) => { const summary = summarizeClientReadiness(demo.checks); return (
          <article className="rounded-xl border border-[var(--line)] bg-white p-5" key={demo.organizationId}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase text-[var(--muted)]">{demo.organizationName}</p><h2 className="mt-1 text-2xl font-black">{demo.venueName}</h2><p className="mt-2 text-sm font-bold text-[var(--muted)]">{summary.requiredPassed}/{summary.requiredTotal} required checks ready</p></div><span className={`w-fit rounded-lg px-3 py-2 text-xs font-black uppercase ${summary.canDemo ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}>{summary.canDemo ? "Demo ready" : `${summary.blockers.length} blockers`}</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{demo.checks.map((check) => <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={check.key}><div className="flex items-start justify-between gap-2"><p className="text-sm font-black">{check.label}</p><span className={`text-[10px] font-black uppercase ${check.passed ? "text-emerald-700" : check.required ? "text-amber-800" : "text-slate-600"}`}>{check.passed ? "Ready" : check.required ? "Action" : "Optional"}</span></div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{check.detail}</p></div>)}</div>
            <div className="mt-5 flex flex-wrap gap-2"><form action={prepareReferenceDemoAction}><input name="organization_id" type="hidden" value={demo.organizationId} /><input name="venue_id" type="hidden" value={demo.venueId} /><button className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">Prepare reference demo</button></form><Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href="/today">Today</Link><Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href={`/admin/pilot-launch?venueId=${demo.venueId}`}>Pilot Launch</Link><a className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href={getPublicVenueUrl(demo.venueId)} target="_blank" rel="noreferrer">Public venue</a></div>
          </article>
        ); })}</section>
      )}

      <section className="my-6 rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-xl font-black">Truth guardrails</h2><ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)]"><li>• CSV, iCal, and public-feed schedule imports are sellable today.</li><li>• SportsEngine direct sync is credential-ready but must not be described as generally live.</li><li>• Daktronics is read-only; physical control is not part of the offer.</li><li>• GameChanger, TeamSnap, LeagueApps, PlayMetrics, Nevco, cameras, and broad streaming remain unverified, scaffolded, demo-only, or future unless a specific deployment proves otherwise.</li></ul></section>
    </main>
  );
}
