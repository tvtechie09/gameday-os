import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export const dynamic = "force-dynamic";

// Landing page for invite and recovery links. The /auth/callback route has
// already exchanged the emailed code for a session, so the user arrives here
// authenticated but (for invites) without a password of their own yet.
export default async function SetPasswordPage() {
  const authUser = await getSupabaseAuthUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">GameDay OS</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)]">Set your password</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Choose the password you&apos;ll use to sign in to GameDay OS from now on.
        </p>
      </div>

      <SetPasswordForm hasSession={Boolean(authUser)} />
    </main>
  );
}
