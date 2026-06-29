import { CrossroadsGameCard, CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { getFamilyModeContext } from "@/lib/demo/crossroads";

export default function CrossroadsFamilyPage() {
  const context = getFamilyModeContext();

  return (
    <CrossroadsPageShell eyebrow="Family Mode" title={context.welcome}>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Your game day</p>
          <h2 className="mt-2 text-3xl font-black">You are parked in {context.parking?.label ?? "South Lot"}</h2>
          <p className="mt-4 text-xl font-black">Your game is on {context.surface?.code ?? "Field 6B"}</p>
          <p className="mt-2 text-sm font-bold text-[var(--muted)]">Walking time: {context.walkingTime}</p>
          {context.surface ? <div className="mt-4"><CrossroadsStatusBadge status={context.surface.status} /></div> : null}
          <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">{context.directions}</p>
        </section>

        <section>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Today’s team schedule</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {context.games.map((game) => <CrossroadsGameCard game={game} key={game.id} />)}
          </div>
        </section>
      </div>
    </CrossroadsPageShell>
  );
}
