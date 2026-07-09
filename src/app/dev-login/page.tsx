import { notFound } from "next/navigation";
import { roleLabels } from "@/lib/access/catalog";
import { demoUsers } from "@/lib/access/demo-users";
import { isDevLoginEnabled } from "@/lib/access/session";

export const dynamic = "force-dynamic";

// Dev/staging-only role selector. The app has no real login yet, so this
// screen lets you sign in as one of the seeded demo users to exercise each
// role-based experience. Disabled entirely in production.
export default async function DevLoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string; next?: string; denied?: string }> }>) {
  if (!isDevLoginEnabled()) {
    notFound();
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">GameDay OS · Non-production</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)]">Dev Login</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Choose a demo user to sign in as. Each maps to a real seeded account with genuine role assignments, so
          navigation and permissions reflect what that role actually sees.
        </p>
      </div>

      {params.error === "unknown-user" ? (
        <p className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          Unknown demo user. Please pick one below.
        </p>
      ) : null}
      {params.denied ? (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          You need to sign in to view <code className="font-mono">{params.denied}</code>.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {demoUsers.map((user) => (
          <form key={user.key} action="/api/dev-login/login" method="post" className="h-full">
            <input type="hidden" name="user" value={user.key} />
            {params.next ? <input type="hidden" name="next" value={params.next} /> : null}
            <button
              type="submit"
              className="flex h-full w-full flex-col rounded-xl border border-[var(--line)] bg-white p-4 text-left transition hover:border-emerald-400 hover:shadow-sm"
            >
              <span className="inline-flex w-fit rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700">
                {roleLabels[user.roleKey]}
              </span>
              <span className="mt-2 text-base font-black text-[var(--foreground)]">{user.displayName}</span>
              <span className="text-xs font-semibold text-[var(--muted)]">{user.email}</span>
              {user.venueName ? (
                <span className="mt-1 text-[11px] font-bold text-[var(--muted)]">{user.venueName}</span>
              ) : null}
              <span className="mt-3 text-xs leading-5 text-[var(--muted)]">{user.blurb}</span>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
