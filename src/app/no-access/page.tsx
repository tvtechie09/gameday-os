import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/access/navigation";
import { resolveSession } from "@/lib/access/session";

export const dynamic = "force-dynamic";

// Clean screen for a user who is authenticated but has no role assignment (or no
// public.users row). Guests are sent to login; users who DO have a role are
// bounced to their home so this page is only ever the true no-access state.
export default async function NoAccessPage() {
  const resolved = await resolveSession();
  if (resolved.kind === "guest") {
    redirect("/login");
  }
  if (resolved.kind === "active") {
    redirect(getRoleHome(resolved.context));
  }

  const email = resolved.email;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 text-center sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">GameDay OS</p>
      <h1 className="mt-2 text-2xl font-black leading-tight text-[var(--foreground)]">No access assigned</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        You&apos;re signed in{email ? <> as <span className="font-bold">{email}</span></> : null}, but no role has been
        assigned to you yet. Contact your administrator to request access.
      </p>

      <form action="/logout" method="post" className="mt-6">
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black text-[var(--foreground)] transition hover:border-emerald-400"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
