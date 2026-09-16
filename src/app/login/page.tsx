import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/access/navigation";
import { isDevLoginEnabled, resolveSession } from "@/lib/access/session";
import { LoginForm } from "@/components/auth/login-form";
import { isPilotPreviewEnvironment } from "@/lib/pilot-build";

export const dynamic = "force-dynamic";

// Real Supabase email/password login. Already-authenticated users are bounced to
// their role home (or the no-access screen). The dev-login link only appears
// when dev-login is enabled (dev/staging).
export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string }> }>) {
  const resolved = await resolveSession();
  if (resolved.kind === "active") {
    redirect(getRoleHome(resolved.context));
  }
  if (resolved.kind === "no-access") {
    redirect("/no-access");
  }

  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "";
  const pilotPreview = isPilotPreviewEnvironment();
  const devLoginEnabled = isDevLoginEnabled() && !pilotPreview;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">GameDay OS</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)]">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Sign in with your GameDay OS account to continue.
        </p>
      </div>

      <LoginForm next={next} devLoginEnabled={devLoginEnabled} pilotPreview={pilotPreview} />
    </main>
  );
}
