import Link from "next/link";

const emptyStates = [
  { label: "Venues", value: "0", note: "Create your first venue to begin." },
  { label: "Fields", value: "0", note: "Fields will appear after venue setup." },
  { label: "Sessions", value: "0", note: "Schedule tools come next." },
  { label: "Sponsors", value: "0", note: "Sponsor inventory is ready to connect." },
];

export default function AdminDashboard() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Admin</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Operations dashboard</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Manage the venue-first building blocks for GameDay OS from one quiet, mobile-friendly shell.
          </p>
        </div>
        <Link
          href="/admin/venues/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--accent-strong)]"
        >
          New venue
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {emptyStates.map((item) => (
          <article key={item.label} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-sm font-bold text-[var(--muted)]">{item.label}</p>
            <p className="mt-4 text-4xl font-black">{item.value}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] p-5">
          <h2 className="text-lg font-black">Setup checklist</h2>
        </div>
        <div className="grid gap-0 divide-y divide-[var(--line)]">
          {["Create a venue", "Add fields", "Plan game day sessions", "Assign sponsor placements"].map((item) => (
            <div key={item} className="flex items-center justify-between gap-4 p-5">
              <span className="text-sm font-bold">{item}</span>
              <span className="rounded-md border border-[var(--line)] px-2 py-1 text-xs font-bold text-[var(--muted)]">Pending</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
