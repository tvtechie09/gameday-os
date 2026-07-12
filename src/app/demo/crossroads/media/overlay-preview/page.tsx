import Link from "next/link";
import { CrossroadsPageShell } from "@/components/crossroads/crossroads-ui";
import { OverlayPreviewCard } from "@/components/crossroads/media-engine-panels";
import { getCrossroadsMediaEngineContext } from "@/lib/demo/crossroads-media";

export const dynamic = "force-dynamic";

export default function CrossroadsMediaOverlayPreviewPage() {
  const context = getCrossroadsMediaEngineContext();

  return (
    <CrossroadsPageShell
      actions={<Link className="ui-button ui-button-secondary" href="/demo/crossroads/media">Back to Media Engine</Link>}
      eyebrow="Media Engine"
      title="Overlay Preview"
    >
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <OverlayPreviewCard />

        <article className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Normalized Game State</p>
          <h2 className="mt-2 text-2xl font-black">Field 6B Live</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Info label="Game" value={`${context.field6BGameState.homeTeam} vs ${context.field6BGameState.awayTeam}`} />
            <Info label="Score" value={`${context.field6BGameState.homeScore}-${context.field6BGameState.awayScore}`} />
            <Info label="Inning" value={context.field6BGameState.inning} />
            <Info label="Count" value={`${context.field6BGameState.balls ?? 0}-${context.field6BGameState.strikes ?? 0}, ${context.field6BGameState.outs ?? 0} outs`} />
            <Info label="Source" value={context.field6BGameState.source.replaceAll("_", " ")} />
            <Info label="Official" value={context.field6BGameState.isOfficial ? "Configured official demo source" : "Unofficial"} />
          </div>
          <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm font-bold leading-6 text-[var(--muted)]">
            Overlay previews consume normalized Game State Engine data. No real Daktronics, GameChanger, OBS, RTMP, or camera integration is connected.
          </p>
        </article>
      </section>
    </CrossroadsPageShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
