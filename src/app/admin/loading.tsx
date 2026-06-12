function LoadingCard() {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-10 w-16 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-full rounded bg-slate-200" />
    </div>
  );
}

export default function AdminLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-10 w-72 max-w-full rounded bg-slate-200" />
      <div className="mt-4 h-5 w-full max-w-xl rounded bg-slate-200" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    </section>
  );
}
