export default function SessionsLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-24 rounded bg-[var(--line)]" />
      <div className="mt-4 h-10 w-64 rounded bg-[var(--line)]" />
      <div className="mt-8 grid gap-4">
        {[1, 2].map((item) => (
          <div key={item} className="h-48 rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="h-6 w-2/3 rounded bg-[var(--line)]" />
            <div className="mt-4 h-4 w-full rounded bg-[var(--line)]" />
            <div className="mt-8 h-20 rounded-lg bg-[var(--background)]" />
          </div>
        ))}
      </div>
    </section>
  );
}
