import Link from "next/link";

const capabilities = [
  "Create and manage venue field pages",
  "Prepare sessions for game day traffic",
  "Attach sponsor placements to field surfaces",
  "Publish QR-accessible pages for teams and visitors",
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-16 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venue-first sports operations</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.03] text-[var(--foreground)] sm:text-5xl">
              GameDay OS
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              A clean operating shell for sports venues to organize fields, sessions, sponsors, and QR-accessible public field pages.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
              >
                Open admin
              </Link>
              <Link
                href="/admin/venues/new"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                Set up venue
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 shadow-sm">
            <div className="rounded-md bg-[var(--foreground)] p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">Field page preview</p>
                <span className="rounded-md bg-white/15 px-2 py-1 text-xs font-semibold">QR ready</span>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-md bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Now active</p>
                  <p className="mt-2 text-2xl font-black">Field status</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-[var(--grass)] p-4">
                    <p className="text-xs font-semibold text-white/75">Session</p>
                    <p className="mt-1 text-lg font-extrabold">Ready</p>
                  </div>
                  <div className="rounded-md bg-[var(--clay)] p-4">
                    <p className="text-xs font-semibold text-white/75">Sponsor</p>
                    <p className="mt-1 text-lg font-extrabold">Slot</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability) => (
            <div key={capability} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="mb-4 h-2 w-12 rounded-full bg-[var(--accent)]" />
              <p className="text-sm font-bold leading-6">{capability}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
