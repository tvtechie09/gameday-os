export default function AdminLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-10 w-72 max-w-full rounded bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-xl rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div className="ui-card p-5" key={item}>
              <div className="h-10 w-10 rounded-lg bg-slate-200" />
              <div className="mt-5 h-3 w-24 rounded bg-slate-200" />
              <div className="mt-3 h-9 w-16 rounded bg-slate-200" />
              <div className="mt-4 h-4 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
