import { redirect } from "next/navigation";
import { canImpersonate } from "@/lib/access/capabilities";
import { roleLabels } from "@/lib/access/catalog";
import { demoUsers } from "@/lib/access/demo-users";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext, isDevLoginEnabled } from "@/lib/access/session";

export const dynamic = "force-dynamic";

// Admin-only impersonation console. Middleware already guards this route on
// canImpersonate; the extra check here is defense-in-depth for direct render.
export default async function ImpersonationPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const ctx = await getSessionContext();
  if (!ctx || !canImpersonate(ctx)) {
    redirect(getRoleHome(ctx));
  }

  const params = await searchParams;
  const targets = demoUsers.filter((user) => user.roleKey !== "platform_admin");
  const devLogin = isDevLoginEnabled();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Admin · Access</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Dev Login &amp; Impersonation</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          View the app exactly as another role sees it. Your real admin session is preserved and a persistent banner
          lets you exit at any time.
        </p>
      </header>

      {params.error === "unknown-user" ? (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          Unknown user. Pick a demo user below.
        </p>
      ) : null}

      {!devLogin ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          Impersonation is disabled in this environment.
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {targets.map((user) => (
          <div key={user.key} className="flex flex-col rounded-xl border border-[var(--line)] bg-white p-4">
            <span className="inline-flex w-fit rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700">
              {roleLabels[user.roleKey]}
            </span>
            <span className="mt-2 text-base font-black text-[var(--foreground)]">{user.displayName}</span>
            <span className="text-xs font-semibold text-[var(--muted)]">{user.email}</span>
            <span className="mt-2 flex-1 text-xs leading-5 text-[var(--muted)]">{user.blurb}</span>
            <form action="/api/dev-login/impersonate" method="post" className="mt-3">
              <input type="hidden" name="user" value={user.key} />
              <button
                type="submit"
                disabled={!devLogin}
                className="min-h-10 w-full rounded-lg bg-[var(--black-soft)] px-3 py-2 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Impersonate {roleLabels[user.roleKey]}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
