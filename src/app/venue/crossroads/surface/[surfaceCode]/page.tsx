import { CrossroadsGameCard, CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { getCrossroadsField, getCrossroadsSurface, getGamesForSurface } from "@/lib/demo/crossroads";

type SurfacePageProps = {
  params: Promise<{ surfaceCode: string }>;
};

export default async function CrossroadsSurfacePage({ params }: SurfacePageProps) {
  const { surfaceCode } = await params;
  const surface = getCrossroadsSurface(surfaceCode);

  if (!surface) {
    return (
      <CrossroadsPageShell eyebrow="Play Surface QR" title="Surface not found">
        <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm font-bold text-[var(--muted)]">That Crossroads demo play surface does not exist.</p>
      </CrossroadsPageShell>
    );
  }

  const field = getCrossroadsField(surface.parentFieldId.replace("field-", ""));
  const games = getGamesForSurface(surface.code);

  return (
    <CrossroadsPageShell eyebrow="Play Surface QR" title={surface.name}>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--muted)]">{field?.name ?? "Parent field"}</p>
              <h2 className="mt-1 text-3xl font-black">{surface.code}</h2>
            </div>
            <CrossroadsStatusBadge status={surface.status} />
          </div>
          <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
            This is a schedulable subfield/play surface. Scorekeeper and field marshal permissions can be scoped directly to this surface.
          </p>
        </section>

        <section>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Today on {surface.code}</p>
          <div className="mt-4 grid gap-4">
            {games.length > 0 ? games.map((game) => <CrossroadsGameCard game={game} key={game.id} />) : <p className="rounded-lg bg-white p-5 text-sm font-bold text-[var(--muted)]">No games scheduled on this play surface.</p>}
          </div>
        </section>
      </div>
    </CrossroadsPageShell>
  );
}
