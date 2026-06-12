export default function ResourceDashboardLoading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-10 w-full max-w-xl animate-pulse rounded bg-slate-200" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-4" key={item}>
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-36 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-5" key={item}>
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-7 w-44 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-28 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-3 h-24 animate-pulse rounded-lg bg-amber-50" />
          </div>
        ))}
      </div>
    </section>
  );
}
