import Link from "next/link";
import { DisplayChannelsPanel } from "@/components/crossroads/mayor-demo-panels";
import { getCrossroadsMediaChannel, getCrossroadsMediaEngineContext } from "@/lib/demo/crossroads-media";
import {
  scoreboardFeedDemoSources,
  type NormalizedGameState,
  type ScoreboardFeedDemoSource,
  type ScoreboardFeedIndicator,
} from "@/lib/scoreboard-feed";
import { getCrossroadsTvPlaylist } from "@/lib/demo/crossroads-digital-experience";

export const dynamic = "force-dynamic";

type CrossroadsTvPageProps = {
  searchParams?: Promise<{
    source?: string;
  }>;
};

function readSource(value: string | undefined): ScoreboardFeedDemoSource {
  return scoreboardFeedDemoSources.some((source) => source.id === value) ? value as ScoreboardFeedDemoSource : "daktronics";
}

function statusTone(indicator: ScoreboardFeedIndicator | string) {
  const tones: Record<string, string> = {
    data_stale: "bg-amber-300 text-black",
    delayed: "bg-amber-400 text-black",
    final: "bg-slate-200 text-slate-950",
    future_gamechanger_source: "bg-sky-300 text-sky-950",
    live: "bg-green-400 text-black",
    manual_update: "bg-white text-slate-950",
    scoreboard_offline: "bg-red-500 text-white",
    warmups: "bg-blue-300 text-blue-950",
  };

  return tones[indicator] ?? "bg-white/15 text-white";
}

function formatTime(value: string) {
  return value;
}

function SourceBadge({ state }: { state: NormalizedGameState }) {
  const label = state.source === "daktronics_readonly"
    ? "Daktronics Read-Only"
    : state.source === "mock_gamechanger"
      ? "Future GameChanger Source"
      : "Manual Entry";

  return <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-white/70">{label}</span>;
}

function GamePanel({ state }: { state: NormalizedGameState }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-green-300">{state.playSurfaceId.replace("surface-", "").toUpperCase()}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{state.homeTeam} vs {state.awayTeam}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.indicators.map((indicator) => (
            <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusTone(indicator)}`} key={indicator}>
              {indicator.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl bg-black/35 p-5">
        <p className="text-lg font-black text-white">{state.homeTeam}</p>
        <p className="text-center text-6xl font-black leading-none text-white md:text-7xl">
          {state.homeScore}-{state.awayScore}
        </p>
        <p className="text-right text-lg font-black text-white">{state.awayTeam}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-white/70">
        <span>{state.inning}</span>
        <span>Updated {new Date(state.lastUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        <SourceBadge state={state} />
      </div>
    </article>
  );
}

export default async function CrossroadsTvPage({ searchParams }: CrossroadsTvPageProps) {
  const params = await searchParams;
  const source = readSource(params?.source);
  const tv = getCrossroadsTvPlaylist(source);
  const board = tv.board;
  const staleOrOffline = board.states.filter((state) => state.freshness === "stale" || state.freshness === "offline");
  const emergencyItem = tv.items.find((item) => item.priority === "emergency");
  const media = getCrossroadsMediaEngineContext();
  const field6BMedia = getCrossroadsMediaChannel("media-channel-field-6b-live");

  return (
    <main className="min-h-screen bg-[#06140c] text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-green-300">Crossroads Bar TV</p>
            <h1 className="mt-2 text-4xl font-black tracking-normal md:text-6xl">{board.venue.name}</h1>
            <p className="mt-2 text-lg font-semibold text-white/70">Live games, delays, finals, and upcoming schedule for concession, Chill Zone, and lobby screens.</p>
          </div>
          <div className="grid gap-2 text-right">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Demo Source</p>
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
              {scoreboardFeedDemoSources.map((item) => (
                <Link
                  className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${item.id === source ? "bg-green-300 text-black" : "bg-white/10 text-white"}`}
                  href={`/demo/crossroads/tv?source=${item.id}`}
                  key={item.id}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <section className={`mt-5 rounded-2xl border p-4 ${emergencyItem ? "border-red-300/40 bg-red-500/20" : "border-amber-300/30 bg-amber-300/15"}`}>
          <p className={`text-sm font-black uppercase tracking-[0.18em] ${emergencyItem ? "text-red-100" : "text-amber-200"}`}>
            {emergencyItem ? "Emergency Display Override" : "Weather Alert"}
          </p>
          <p className="mt-1 text-2xl font-black">{emergencyItem?.body ?? tv.weatherItem?.body}</p>
          {emergencyItem?.futureIntegrationLabel ? (
            <p className="mt-2 text-sm font-bold text-white/70">{emergencyItem.futureIntegrationLabel}. This demo does not control emergency systems or signage players.</p>
          ) : null}
        </section>

        <section className="mt-5 grid flex-1 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-2">
              {board.live.map((state) => <GamePanel key={state.gameId} state={state} />)}
              {board.finals.map((state) => <GamePanel key={state.gameId} state={state} />)}
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/[0.08] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black">Delayed Fields</h2>
                <span className="rounded-md bg-amber-400 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-black">{board.delayed.length} delayed</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {board.delayed.map((state) => (
                  <div className="rounded-xl bg-black/25 p-4" key={state.gameId}>
                    <p className="text-xl font-black">{state.playSurfaceId.replace("surface-", "").toUpperCase()} · {state.homeTeam} vs {state.awayTeam}</p>
                    <p className="mt-1 text-sm font-bold text-white/70">{state.inning} · updated {new Date(state.lastUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-green-300/30 bg-green-300/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-green-300">Media Engine Demo</p>
                  <h2 className="mt-2 text-3xl font-black">Field 6B Live with score overlay</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-white/70">Mock camera feed routed through GameDay Media Engine. No real camera, OBS, RTMP, YouTube, or signage system is connected.</p>
                </div>
                <Link className="rounded-lg bg-green-300 px-4 py-3 text-sm font-black text-black" href="/demo/crossroads/media">
                  Open Media Engine
                </Link>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-5">
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">Mock Video Feed</p>
                    <p className="mt-3 text-4xl font-black">Field 6B</p>
                    <p className="mt-2 text-sm font-bold text-white/60">{field6BMedia.source?.name ?? "Field 6B camera mock"}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-black/35 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Overlay Preview</p>
                  <div className="mt-3 grid gap-2">
                    {media.overlayPreview.lines.map((line) => <p className="text-lg font-black" key={line}>{line}</p>)}
                  </div>
                  {media.overlayPreview.sponsorPlacement ? <p className="mt-4 rounded-md bg-white/10 px-3 py-2 text-sm font-black">{media.overlayPreview.sponsorPlacement}</p> : null}
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-white/50">{media.overlayPreview.poweredBy}</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="grid gap-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.08] p-5">
              <h2 className="text-2xl font-black">Upcoming Games</h2>
              <div className="mt-4 grid gap-3">
                {board.upcoming.map((game) => (
                  <div className="rounded-xl bg-black/25 p-4" key={game.id}>
                    <p className="text-lg font-black">{game.surfaceCode} · {formatTime(game.startTime)}</p>
                    <p className="mt-1 text-sm font-bold text-white/70">{game.homeTeam} vs {game.awayTeam}</p>
                  </div>
                ))}
              </div>
            </section>

            <DisplayChannelsPanel dark />

            <section className="rounded-2xl border border-white/10 bg-white/[0.08] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black">Display Playlist</h2>
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-white/70">{tv.playlist.rotationSeconds}s rotation</span>
              </div>
              <div className="mt-4 grid gap-3">
                {tv.items.slice(0, 5).map((item) => (
                  <div className="rounded-xl bg-black/25 p-4" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-black">{item.title}</p>
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${item.priority === "emergency" ? "bg-red-500 text-white" : "bg-white/10 text-white/70"}`}>
                        {item.type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-6 text-white/70">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.08] p-5">
              <h2 className="text-2xl font-black">Scoreboard Feed Health</h2>
              <div className="mt-4 grid gap-3">
                {board.scoreboardHealth.slice(0, 5).map((item) => (
                  <div className="rounded-xl bg-black/25 p-4" key={item.normalized.gameId}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{item.fieldName} · {item.surfaceCode}</p>
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${item.providerHealth.status === "healthy" ? "bg-green-300 text-black" : item.providerHealth.status === "stale" ? "bg-amber-300 text-black" : "bg-red-500 text-white"}`}>
                        {item.providerHealth.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white/60">{item.providerHealth.message}</p>
                  </div>
                ))}
              </div>
            </section>

            {staleOrOffline.length > 0 ? (
              <section className="rounded-2xl border border-red-400/30 bg-red-500/15 p-5">
                <h2 className="text-2xl font-black">Attention Needed</h2>
                <p className="mt-2 text-sm font-bold text-white/70">{staleOrOffline.length} feed issue{staleOrOffline.length === 1 ? "" : "s"} detected. Manual entry remains available.</p>
              </section>
            ) : null}

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
              {tv.sponsorItem ? <PromoPanel eyebrow="Sponsor Panel" title={tv.sponsorItem.title} body={tv.sponsorItem.body} /> : null}
              {tv.menuItem ? <PromoPanel eyebrow="Menu / Food Promo" title={tv.menuItem.title} body={tv.menuItem.body} /> : null}
              {tv.villageItem ? <PromoPanel eyebrow="Village Event Ad" title={tv.villageItem.title} body={tv.villageItem.body} /> : null}
            </section>
          </aside>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm font-black uppercase tracking-[0.16em] text-white/50">
          <span>Powered by GameDay OS</span>
          <span>No scoreboard control commands are sent from this display</span>
        </footer>
      </section>
    </main>
  );
}

function PromoPanel({ body, eyebrow, title }: { body: string; eyebrow: string; title: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.08] p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-green-300">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <p className="mt-3 text-sm font-bold leading-6 text-white/70">{body}</p>
    </section>
  );
}
