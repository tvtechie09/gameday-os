// Persistent banner shown across the app while a Platform Admin is impersonating
// a demo user. Rendered from server state only when an impersonator session is
// present; it is never rendered (or sent) for normal users.

export function ImpersonationBanner({
  roleLabel,
  email,
}: Readonly<{ roleLabel: string; email: string }>) {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm font-black text-amber-950 sm:px-6">
      <span className="inline-flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-950 text-[10px] text-amber-100">!</span>
        Viewing as {roleLabel} — {email}
      </span>
      <form action="/api/dev-login/exit-impersonation" method="post">
        <button
          type="submit"
          className="min-h-8 rounded-md bg-amber-950 px-3 py-1 text-xs font-black text-amber-50 transition hover:bg-amber-900"
        >
          Exit Impersonation
        </button>
      </form>
    </div>
  );
}
