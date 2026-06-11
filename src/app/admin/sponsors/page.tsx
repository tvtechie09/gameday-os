import { EmptyState } from "@/components/empty-state";
import { sponsors } from "@/lib/data";

export default function SponsorsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsors</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Sponsor list</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Local sponsor placements represent the inventory that can appear on public field pages and session surfaces.
        </p>
      </div>

      {sponsors.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sponsors.map((sponsor) => (
            <article key={sponsor.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{sponsor.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{sponsor.placement}</p>
                </div>
                <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--accent-strong)]">{sponsor.status}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No sponsors yet"
            message="Sponsor placements will show here when the venue is ready to add local partners to field pages."
          />
        </div>
      )}
    </section>
  );
}
