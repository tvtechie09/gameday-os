export default function PublicFieldLoading() {
  return (
    <section className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-0 sm:px-6 sm:py-8">
        <div className="overflow-hidden bg-[var(--panel)] shadow-sm sm:rounded-lg sm:border sm:border-[var(--line)]">
          <div className="h-40 animate-pulse bg-slate-800" />
          <main className="grid gap-4 p-4 sm:p-5">
            <div className="ui-card-strong animate-pulse p-5">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="mt-4 h-9 w-3/4 rounded bg-slate-200" />
              <div className="mt-5 h-28 rounded-lg bg-slate-200" />
            </div>
            {[0, 1, 2].map((item) => (
              <div className="ui-card h-28 animate-pulse bg-slate-100 p-5" key={item} />
            ))}
          </main>
        </div>
      </div>
    </section>
  );
}
