import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManagePlatform, isPlatformAdmin } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { listDemoTenants, packageCatalog, type DemoTenant } from "@/lib/services/provisioning";
import { provisionVenueAction, teardownDemoAction } from "./actions";

export const dynamic = "force-dynamic";

const field = "min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm";
const labelText = "text-xs font-bold text-[var(--muted)]";
const sectionLabel = "text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]";

type SearchParams = {
  error?: string;
  done?: string;
  venue?: string;
  name?: string;
  fields?: string;
  surfaces?: string;
  boards?: string;
  cameras?: string;
  audio?: string;
  audioprofiles?: string;
  league?: string;
  demo?: string;
  plan?: string;
  torndown?: string;
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await getSessionContext();
  // Sales-led by design — no public self-serve signup. Staff only.
  if (!ctx || (!isPlatformAdmin(ctx) && !canManagePlatform(ctx))) redirect(getRoleHome(ctx));

  const sp = await searchParams;
  const demos: DemoTenant[] = await listDemoTenants(ctx).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Admin · Platform</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Onboard a customer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          A venue said yes, or you need a demo — stand it up here in one step. Creates the organization, the venue, every
          field (including splits), their devices, and records the package. GameDay staff only; there is no public signup.
        </p>
      </header>

      {sp.done ? (
        <section className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="text-lg font-black text-emerald-900">
            {sp.name} is live{sp.demo === "1" ? " (demo)" : ""}.
          </h2>
          <p className="mt-1 text-sm font-semibold text-emerald-900">
            {sp.fields} field{sp.fields === "1" ? "" : "s"} · {sp.surfaces} play surface{sp.surfaces === "1" ? "" : "s"}
            {Number(sp.boards ?? 0) > 0 ? ` · ${sp.boards} scoreboard${sp.boards === "1" ? "" : "s"}` : ""}
            {Number(sp.cameras ?? 0) > 0 ? ` · ${sp.cameras} camera${sp.cameras === "1" ? "" : "s"}` : ""}
            {Number(sp.audio ?? 0) > 0 ? " · PA" : ""}
            {Number(sp.audioprofiles ?? 0) > 0 ? ` · ${sp.audioprofiles} field audio default${sp.audioprofiles === "1" ? "" : "s"}` : ""}
            {sp.plan === "1" ? " · plan recorded" : ""}
          </p>
          {Number(sp.boards ?? 0) > 0 || Number(sp.cameras ?? 0) > 0 ? (
            <p className="mt-2 text-xs font-semibold text-emerald-800">
              Devices are registered but not yet reporting — the Command Center will show them as
              &ldquo;registered, none reporting yet&rdquo; until they&rsquo;re installed and online. That&rsquo;s honest, not broken.
            </p>
          ) : null}
          {sp.league === "1" ? (
            <p className="mt-2 text-xs font-semibold text-emerald-800">
              League recorded. The owner still needs to accept their invite — the league itself is created when they sign
              up, because their account has to exist first.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" href="/admin/command-center">Open Command Center</Link>
            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" href="/admin/fields">Fields &amp; QR codes</Link>
            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" href="/admin/billing">Billing</Link>
            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold" href="/admin/onboarding">Onboard another</Link>
          </div>
        </section>
      ) : null}

      {sp.torndown ? (
        <p className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-bold text-[var(--foreground)]">
          Demo &ldquo;{sp.torndown}&rdquo; and everything under it has been deleted.
        </p>
      ) : null}

      {sp.error ? (
        <p className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{sp.error}</p>
      ) : null}

      <form action={provisionVenueAction} className="mt-6 grid gap-5 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        {/* --- What kind of customer -------------------------------------- */}
        <div className="grid gap-3">
          <p className={sectionLabel}>What are we standing up?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--line)] p-3">
              <input type="radio" name="account_type" value="complex" defaultChecked className="mt-1" />
              <span>
                <span className="block text-sm font-black text-[var(--foreground)]">Field complex</span>
                <span className="block text-xs text-[var(--muted)]">They run fields. Venue OS subscription.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--line)] p-3">
              <input type="radio" name="account_type" value="organization" className="mt-1" />
              <span>
                <span className="block text-sm font-black text-[var(--foreground)]">Organization</span>
                <span className="block text-xs text-[var(--muted)]">Fields <em>and</em> teams. Adds the league line.</span>
              </span>
            </label>
          </div>
        </div>

        {/* --- The customer ----------------------------------------------- */}
        <div className="grid gap-3 border-t border-[var(--line-soft)] pt-5">
          <p className={sectionLabel}>The customer</p>
          <label className="grid gap-1">
            <span className={labelText}>Organization name *</span>
            <input name="organization_name" required placeholder="Riverside Parks District" className={field} />
          </label>
          <label className="grid gap-1">
            <span className={labelText}>Venue name *</span>
            <input name="venue_name" required placeholder="Riverside Sports Complex" className={field} />
          </label>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <label className="grid gap-1"><span className={labelText}>Address</span><input name="address" className={field} /></label>
            <label className="grid gap-1"><span className={labelText}>City</span><input name="city" className={field} /></label>
            <label className="grid gap-1"><span className={labelText}>State</span><input name="state" maxLength={20} className={`${field} w-24`} /></label>
          </div>
        </div>

        {/* --- Fields ------------------------------------------------------ */}
        <div className="grid gap-3 border-t border-[var(--line-soft)] pt-5">
          <p className={sectionLabel}>Their fields</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1"><span className={labelText}>How many? *</span><input name="field_count" type="number" min={1} max={60} defaultValue={8} required className={field} /></label>
            <label className="grid gap-1"><span className={labelText}>Naming pattern</span><input name="field_pattern" defaultValue="Field {n}" className={field} /></label>
            <label className="grid gap-1"><span className={labelText}>Sport</span>
              <select name="sport_type" defaultValue="baseball" className={`${field} bg-white font-bold`}>
                <option value="baseball">Baseball</option><option value="softball">Softball</option><option value="soccer">Soccer</option>
                <option value="volleyball">Volleyball</option><option value="basketball">Basketball</option>
                <option value="football">Football</option><option value="lacrosse">Lacrosse</option><option value="other">Other</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1">
            <span className={labelText}>Do the fields divide?</span>
            <select name="splits_per_field" defaultValue="0" className={`${field} bg-white font-bold`}>
              <option value="0">No — each field is one playing surface</option>
              <option value="2">Yes — each splits into 2 (A, B)</option>
              <option value="3">Yes — each splits into 3 (A, B, C)</option>
              <option value="4">Yes — each splits into 4 (A, B, C, D)</option>
            </select>
          </label>
          <p className="text-xs text-[var(--muted)]">
            Use <code className="font-mono">{"{n}"}</code> for the number — &ldquo;Field {"{n}"}&rdquo; makes Field 1, Field 2, &hellip;
            For court sports use &ldquo;Court {"{n}"}&rdquo;; for soccer, &ldquo;Pitch {"{n}"}&rdquo; works too.
            Splitting a field creates Field 1A / 1B / 1C alongside it, so a big diamond can run three 8U games at once.
            Each half gets its own page, QR code, and schedule.
          </p>
        </div>

        {/* --- Technology --------------------------------------------------- */}
        <div className="grid gap-3 border-t border-[var(--line-soft)] pt-5">
          <p className={sectionLabel}>Their technology</p>
          <div className="grid gap-2">
            <label className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
              <input type="checkbox" name="tech_scoreboards" defaultChecked /> Scoreboards <span className="text-xs font-normal text-[var(--muted)]">— one per playing surface</span>
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
              <input type="checkbox" name="tech_cameras" /> Cameras / streaming <span className="text-xs font-normal text-[var(--muted)]">— one per field</span>
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
              <input type="checkbox" name="tech_audio" /> Audio / PA <span className="text-xs font-normal text-[var(--muted)]">— venue-wide</span>
            </label>
          </div>
          <p className="text-xs text-[var(--muted)]">
            This registers the hardware they told us about. It won&rsquo;t show as online until it&rsquo;s installed and reporting.
          </p>
        </div>

        {/* --- League (organizations only) ---------------------------------- */}
        <div className="grid gap-3 border-t border-[var(--line-soft)] pt-5">
          <p className={sectionLabel}>Their league — organizations only</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <label className="grid gap-1"><span className={labelText}>League name</span><input name="league_name" placeholder="Riverside Youth Baseball" className={field} /></label>
            <label className="grid gap-1"><span className={labelText}>How many teams?</span><input name="team_count" type="number" min={1} max={500} className={field} /></label>
          </div>
          <label className="grid gap-1">
            <span className={labelText}>League owner email</span>
            <input name="owner_email" type="email" placeholder="gm@riverside.org" className={field} />
          </label>
          <p className="text-xs text-[var(--muted)]">
            We record the league and invite the owner. The league is created in the team app when <em>they</em> accept —
            their account has to exist first, so we can&rsquo;t make it for them. Leave blank for a field complex.
          </p>
        </div>

        {/* --- Package ------------------------------------------------------ */}
        <div className="grid gap-3 border-t border-[var(--line-soft)] pt-5">
          <p className={sectionLabel}>Their package</p>
          <label className="grid gap-1">
            <span className={labelText}>Package *</span>
            <select name="package_key" defaultValue="complex" className={`${field} bg-white font-bold`}>
              {packageCatalog.map((pkg) => (
                <option key={pkg.key} value={pkg.key}>{pkg.label} — {pkg.sizeHint}</option>
              ))}
            </select>
          </label>
          <ul className="grid gap-1 text-xs text-[var(--muted)]">
            {packageCatalog.map((pkg) => (
              <li key={pkg.key}>
                <span className="font-bold text-[var(--foreground)]">{pkg.label}</span> ({pkg.sizeHint}): {pkg.includes.join(", ")}
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1"><span className={labelText}>Plan label</span><input name="plan_label" placeholder="defaults to the package" className={field} /></label>
            <label className="grid gap-1"><span className={labelText}>Amount ($)</span><input name="plan_amount" placeholder="1500" className={field} /></label>
            <label className="grid gap-1"><span className={labelText}>Interval</span>
              <select name="plan_interval" defaultValue="month" className={`${field} bg-white font-bold`}><option value="month">per month</option><option value="year">per year</option></select>
            </label>
          </div>
          <p className="text-xs text-[var(--muted)]">Leave the amount blank to skip billing. Billed by invoice / PO — we never take a card.</p>
        </div>

        {/* --- Demo --------------------------------------------------------- */}
        <div className="grid gap-2 border-t border-[var(--line-soft)] pt-5">
          <p className={sectionLabel}>Is this real?</p>
          <label className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
            <input type="checkbox" name="is_demo" /> This is a demo — not a real customer
          </label>
          <p className="text-xs text-[var(--muted)]">
            Demos are marked so they can be deleted in one click and kept out of billing. Leave unchecked for a paying
            customer. A real tenant can&rsquo;t be torn down from this screen.
          </p>
        </div>

        <button type="submit" className="min-h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white">Create it</button>
      </form>

      {/* --- Teardown ------------------------------------------------------- */}
      {demos.length > 0 ? (
        <section className="mt-8 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Demo tenants</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Only tenants marked as demos appear here, and teardown re-checks that in the database before deleting
            anything. Type the venue name to confirm — this deletes the organization, venue, fields, surfaces, and devices.
          </p>
          <ul className="mt-4 grid gap-3">
            {demos.map((demo) => (
              <li key={demo.organizationId} className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-sm font-black text-[var(--foreground)]">{demo.venueName ?? demo.organizationName}</p>
                <p className="text-xs text-[var(--muted)]">
                  {demo.organizationName} · {demo.fieldCount} field{demo.fieldCount === 1 ? "" : "s"} · created{" "}
                  {new Date(demo.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <form action={teardownDemoAction} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="organization_id" value={demo.organizationId} />
                  <input type="hidden" name="expected_name" value={demo.venueName ?? demo.organizationName} />
                  <input
                    name="confirm_name"
                    placeholder={`Type "${demo.venueName ?? demo.organizationName}"`}
                    className={`${field} flex-1 min-w-48`}
                  />
                  <button type="submit" className="min-h-11 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-black text-red-800">
                    Tear down
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
