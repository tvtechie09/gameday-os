import Link from "next/link";
import { CrossroadsGameCard, CrossroadsPageShell, CrossroadsReadinessChecklist, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { getTournamentModeContext } from "@/lib/demo/crossroads";

export default function CrossroadsTournamentPage() {
  const context = getTournamentModeContext();

  return (
    <CrossroadsPageShell eyebrow="Tournament Mode" title="Crossroads Tournament Command">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="All Fields" value={context.fields.length} />
        <Metric label="Subfields" value={context.surfaces.length} />
        <Metric label="Delayed/Behind" value={context.delayedGames.length + context.behindGames.length} />
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Next games</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {context.nextGames.map((game) => <CrossroadsGameCard game={game} key={game.id} />)}
          </div>
        </div>
        <aside className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-2xl font-black">Games running behind</h2>
          <div className="mt-4 grid gap-3">
            {context.behindGames.map((game) => (
              <Link className="rounded-lg bg-[var(--background)] p-3" href={`/venue/crossroads/surface/${game.surfaceCode}`} key={game.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black">{game.surfaceCode}</span>
                  <CrossroadsStatusBadge status={game.status} />
                </div>
                <p className="mt-2 text-sm font-bold text-[var(--muted)]">{game.title} · {game.behindMinutes} min behind</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Field readiness checklist</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {context.games.slice(0, 6).map((game) => (
            <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={game.id}>
              <h3 className="text-lg font-black">{game.surfaceCode}</h3>
              <p className="mt-1 text-sm font-bold text-[var(--muted)]">{game.title}</p>
              <div className="mt-4"><CrossroadsReadinessChecklist game={game} /></div>
            </article>
          ))}
        </div>
      </section>
    </CrossroadsPageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
