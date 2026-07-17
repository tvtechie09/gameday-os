import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManagePlatform, isPlatformAdmin } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { provisionVenueAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string; done?: string; venue?: string; name?: string; fields?: string; plan?: string }> }) {
  const ctx = await getSessionContext();
  // Sales-led by design — no public self-serve signup. Staff only.
  if (!ctx || (!isPlatformAdmin(ctx) && !canManagePlatform(ctx))) redirect(getRoleHome(ctx));

  const sp = await searchParams;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Admin · Platform</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Onboard a venue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          A founding venue said yes — stand them up here. This creates the organization, the venue, and every field in
          one step, and records their plan. GameDay staff only; there is no public signup.
        </p>
      </header>

      {sp.done ? (
        <section className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="text-lg font-black text-emerald-900">{sp.name} is live.</h2>
          <p className="mt-1 text-sm font-semibold text-emerald-900">
            {sp.fields} field{sp.fields === "1" ? "" : "s"} created{sp.plan === "1" ? " · plan recorded" : ""}. Next: print the field QR codes and hand the GM their Command Center.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" href="/admin/command-center">Open Command Center</Link>
            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" href="/admin/fields">Fields &amp; QR codes</Link>
            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" href="/admin/billing">Billing</Link>
            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" href="/admin/onboarding">Onboard another</Link>
          </div>
        </section>
      ) : null}

      {sp.error ? (
        <p className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{sp.error}</p>
      ) : null}

      <form action={provisionVenueAction} className="mt-6 grid gap-5 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="grid gap-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">The customer</p>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[var(--muted)]">Organization name *</span>
            <input name="organization_name" required placeholder="Riverside Parks District" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[var(--muted)]">Venue name *</span>
            <input name="venue_name" required placeholder="Riverside Sports Complex" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" />
          </label>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Address</span><input name="address" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">City</span><input name="city" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">State</span><input name="state" maxLength={20} className="min-h-11 w-24 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
          </div>
        </div>

        <div className="grid gap-3 border-t border-[var(--line-soft)] pt-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Their fields</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">How many? *</span><input name="field_count" type="number" min={1} max={60} defaultValue={8} required className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Naming pattern</span><input name="field_pattern" defaultValue="Field {n}" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Sport</span>
              <select name="sport_type" defaultValue="baseball" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold">
                <option value="baseball">Baseball</option><option value="softball">Softball</option><option value="soccer">Soccer</option>
                <option value="football">Football</option><option value="lacrosse">Lacrosse</option><option value="other">Other</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-[var(--muted)]">Use <code className="font-mono">{"{n}"}</code> for the number — &ldquo;Field {"{n}"}&rdquo; makes Field 1, Field 2, &hellip; You can rename or add more later.</p>
        </div>

        <div className="grid gap-3 border-t border-[var(--line-soft)] pt-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Their plan (optional)</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Plan label</span><input name="plan_label" placeholder="Complex" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Amount ($)</span><input name="plan_amount" placeholder="1500" className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-[var(--muted)]">Interval</span>
              <select name="plan_interval" defaultValue="month" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold"><option value="month">per month</option><option value="year">per year</option></select>
            </label>
          </div>
          <p className="text-xs text-[var(--muted)]">Leave the amount blank to skip. Billed by invoice / PO — we never take a card.</p>
        </div>

        <button type="submit" className="min-h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white">Create the venue</button>
      </form>
    </div>
  );
}
