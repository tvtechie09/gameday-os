import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { MfaPanel } from "@/components/auth/mfa-panel";

export const dynamic = "force-dynamic";

// Your own account. Every signed-in admin reaches this -- it only ever acts on
// the caller's own Supabase user, so the guard is just "are you signed in".
export default async function AccountPage() {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect(getRoleHome(ctx));
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Account</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Your account</h1>
      <p className="mt-3 text-base leading-7 text-[var(--muted)]">
        {ctx.displayName} · {ctx.email} · {ctx.roleLabel}
      </p>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Two-factor authentication</h2>
        <div className="mt-4">
          <MfaPanel />
        </div>
      </section>
    </section>
  );
}
