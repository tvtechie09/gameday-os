"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CrossroadsGameCard, CrossroadsReadinessChecklist } from "@/components/crossroads/crossroads-ui";
import { FutureVisionPhasesPanel } from "@/components/crossroads/mayor-demo-panels";
import { FutureVisionPanel } from "@/components/demo/future-vision-panel";
import {
  crossroadsAmenities,
  crossroadsGames,
  crossroadsParkingLots,
  crossroadsPlaySurfaces,
  getFamilyModeContext,
  getTournamentModeContext,
  getVenueOperationsContext,
} from "@/lib/demo/crossroads";
import { getCrossroadsDigitalExperienceContext, getCrossroadsTvPlaylist } from "@/lib/demo/crossroads-digital-experience";
import { crossroadsAssets, crossroadsExecutiveKpis, crossroadsRevenueOpportunities } from "@/lib/demo/crossroads-gm";
import { getCrossroadsMediaEngineContext } from "@/lib/demo/crossroads-media";
import type { PresentationModel, PresentationScenario } from "@/lib/demo/presentation";
import { getCurrentDemoState, getNextSceneIndex, getPreviousSceneIndex, getScenarioLabel } from "@/lib/demo/presentation";

export function PresentationMode({ model }: { model: PresentationModel }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scenario, setScenario] = useState<PresentationScenario>("normal");
  const scene = model.scenes[sceneIndex] ?? model.scenes[0];
  const demoState = useMemo(() => getCurrentDemoState(model.baseState, scenario, scene), [model.baseState, scenario, scene]);
  const progress = `${sceneIndex + 1} / ${model.scenes.length}`;

  return (
    <main className="min-h-screen bg-[#f4f7f1] text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="relative min-h-[220px] sm:min-h-[300px]">
              <Image alt={model.title} className="object-cover" fill priority sizes="100vw" src={model.heroImageUrl} unoptimized />
              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/70">Crossroads Experience Center</p>
                {scene.time ? <p className="mt-2 text-sm font-black uppercase tracking-[0.18em] text-green-200">{scene.time}</p> : null}
                <h1 className="mt-2 text-3xl font-black sm:text-5xl">{scene.title}</h1>
                <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-white/85">{scene.description}</p>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_340px] sm:p-6">
              <SceneView sceneView={scene.view} demoState={demoState} futureVision={model.futureVision} />

              <aside className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{scene.audience}</span>
                  <span className="text-sm font-black text-[var(--muted)]">{progress}</span>
                </div>
                <h2 className="mt-4 text-xl font-black">Talking points</h2>
                {scene.narrative ? (
                  <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-[var(--muted)]">{scene.narrative}</p>
                ) : null}
                {scene.visualState ? (
                  <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm font-black leading-6 text-emerald-900">{scene.visualState}</p>
                ) : null}
                <ul className="mt-3 grid gap-2">
                  {scene.talkingPoints.map((point) => (
                    <li className="rounded-lg bg-white p-3 text-sm font-semibold leading-6" key={point}>{point}</li>
                  ))}
                </ul>
                {scene.cta ? (
                  <Link className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white" href={scene.cta.href}>
                    {scene.cta.label}
                  </Link>
                ) : null}
              </aside>
            </div>
          </div>

          <PresentationControls
            model={model}
            scenario={scenario}
            sceneIndex={sceneIndex}
            setScenario={setScenario}
            setSceneIndex={setSceneIndex}
          />
        </div>
      </section>
    </main>
  );
}

function PresentationControls({
  model,
  scenario,
  sceneIndex,
  setScenario,
  setSceneIndex,
}: {
  model: PresentationModel;
  scenario: PresentationScenario;
  sceneIndex: number;
  setScenario: (scenario: PresentationScenario) => void;
  setSceneIndex: (index: number) => void;
}) {
  return (
    <aside className="rounded-lg border border-black/10 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Presenter Controls</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-black" data-testid="presentation-previous" onClick={() => setSceneIndex(getPreviousSceneIndex(sceneIndex))} type="button">Previous</button>
        <button className="min-h-12 rounded-lg bg-[var(--accent)] px-3 text-sm font-black text-white" data-testid="presentation-next" onClick={() => setSceneIndex(getNextSceneIndex(sceneIndex, model.scenes.length))} type="button">Next</button>
        <button className="col-span-2 min-h-12 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-black" data-testid="presentation-restart" onClick={() => setSceneIndex(0)} type="button">Restart Tour</button>
      </div>

      <label className="mt-5 grid min-w-0 gap-2">
        <span className="text-sm font-black">Jump to scene</span>
        <select className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" data-testid="presentation-jump" onChange={(event) => setSceneIndex(Number(event.target.value))} value={sceneIndex}>
          {model.scenes.map((scene, index) => (
            <option key={scene.id} value={index}>{index + 1}. {scene.title}</option>
          ))}
        </select>
      </label>

      <div className="mt-5">
        <p className="text-sm font-black">Scenario</p>
        <div className="mt-2 grid gap-2">
          {model.scenarios.map((item) => (
            <button
              className={`min-h-12 rounded-lg px-3 text-left text-sm font-black ${scenario === item.id ? "bg-[var(--black-soft)] text-white" : "border border-[var(--line)] bg-white"}`}
              data-testid={`presentation-scenario-${item.id}`}
              key={item.id}
              onClick={() => setScenario(item.id)}
              type="button"
            >
              {item.label}
              <span className={`mt-1 block text-xs font-semibold leading-5 ${scenario === item.id ? "text-white/70" : "text-[var(--muted)]"}`}>{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-[var(--background)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Active scenario</p>
        <p className="mt-1 text-sm font-black">{getScenarioLabel(scenario)}</p>
      </div>
    </aside>
  );
}

function SceneView({
  demoState,
  futureVision,
  sceneView,
}: {
  demoState: ReturnType<typeof getCurrentDemoState>;
  futureVision: PresentationModel["futureVision"];
  sceneView: string;
}) {
  if (sceneView === "future_vision") {
    return (
      <div className="grid gap-4">
        <FutureVisionPhasesPanel />
        <FutureVisionPanel items={futureVision} />
      </div>
    );
  }

  if (sceneView === "family_arrival" || sceneView === "family_navigation") {
    return <FamilyArrivalView demoState={demoState} />;
  }

  if (sceneView === "family_live") {
    return <FamilyLiveView demoState={demoState} />;
  }

  if (sceneView === "team_scorekeeper") {
    return <ScorekeeperView demoState={demoState} />;
  }

  if (sceneView === "tournament_dashboard") {
    return <TournamentView demoState={demoState} />;
  }

  if (sceneView === "weather_delay") {
    return <WeatherDelayView demoState={demoState} />;
  }

  if (sceneView === "gm_dashboard") {
    return <GmDashboardView />;
  }

  if (sceneView === "digital_experience") {
    return <DigitalExperienceView />;
  }

  if (sceneView === "media_engine") {
    return <MediaEngineView />;
  }

  if (sceneView === "venue_operations" || sceneView === "recovery") {
    return <VenueOperationsView demoState={demoState} />;
  }

  return <WelcomeView demoState={demoState} />;
}

function MediaEngineView() {
  const media = getCrossroadsMediaEngineContext();
  const destinations = media.distributionEndpoints.filter((endpoint) => endpoint.activeChannelId === "media-channel-field-6b-live" || endpoint.id === "endpoint-tournament-hq" || endpoint.id === "endpoint-livestream-destination");

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
        <Metric label="Video Sources" value={String(media.videoSources.length)} />
        <Metric label="Media Channels" value={String(media.channels.length)} />
        <Metric label="Distribution Endpoints" value={String(media.distributionEndpoints.length)} />
        <Metric label="Overlay Templates" value={String(media.overlayTemplates.length)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-green-200">Mock Field Camera</p>
          <h2 className="mt-2 text-3xl font-black">Field 6B Live</h2>
          <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-lg bg-black/40 p-5 text-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Demo feed only</p>
              <p className="mt-3 text-4xl font-black">Illinois Celtics vs Bulldogs</p>
              <p className="mt-2 text-sm font-bold text-white/60">No real camera hardware, OBS, RTMP, or streaming destination is connected.</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Score Overlay</p>
          <div className="mt-4 grid gap-2">
            {media.overlayPreview.lines.map((line) => (
              <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-black" key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-black text-emerald-900">{media.overlayPreview.poweredBy}</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {destinations.map((endpoint) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-4" key={endpoint.id}>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{endpoint.endpointType.replaceAll("_", " ")}</p>
            <h3 className="mt-2 text-lg font-black">{endpoint.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{endpoint.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DigitalExperienceView() {
  const digital = getCrossroadsDigitalExperienceContext();
  const tv = getCrossroadsTvPlaylist();
  const featuredZones = digital.displayZones.filter((zone) => ["Chill Zone TVs", "Bar TVs", "Menu Boards", "Main Concourse Displays"].includes(zone.name));

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
        <Metric label="Display Zones" value={String(digital.displayZones.length)} />
        <Metric label="Endpoints" value={String(digital.displayEndpoints.length)} />
        <Metric label="Playlist Items" value={String(digital.contentItems.length)} />
        <Metric label="Emergency Override" value={tv.hasEmergencyOverride ? "READY" : "MODELED"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {featuredZones.map((zone) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-5" key={zone.id}>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{zone.name}</p>
            <h2 className="mt-2 text-2xl font-black">{zone.endpointIds.length} endpoint{zone.endpointIds.length === 1 ? "" : "s"}</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">{zone.description}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-red-900">Current vs Future</p>
        <h2 className="mt-2 text-2xl font-black text-red-950">Emergency banner override is modeled, not connected to live emergency systems</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-red-900">
          GameDay OS can preview public pages, TV dashboards, sponsor panels, Village event ads, and menu board placeholders today. Signage players, POS/menu systems, PA, and emergency integrations require partner approval and implementation.
        </p>
      </div>
    </div>
  );
}

function WelcomeView({ demoState }: { demoState: ReturnType<typeof getCurrentDemoState> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Field 6B" value={demoState.field6BStatus.toUpperCase()} />
      <Metric label="Weather Alert" value={demoState.weatherAlertIssued ? "ISSUED" : "CLEAR"} />
      <Metric label="Announcement" value={demoState.announcementStatus.toUpperCase()} />
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:col-span-3">
        <h2 className="text-2xl font-black">What they will see in 10 minutes</h2>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">A parent gets clarity, a tournament director sees operational risk, and a venue GM sees the complex as one connected operating system.</p>
      </div>
    </div>
  );
}

function FamilyArrivalView({ demoState }: { demoState: ReturnType<typeof getCurrentDemoState> }) {
  const context = getFamilyModeContext();
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Family Mode</p>
        <h2 className="mt-2 text-3xl font-black">Parked in {context.parking?.label}</h2>
        <p className="mt-3 text-xl font-black">Game on {context.surface?.code}</p>
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">Walking time: {context.walkingTime}</p>
        {demoState.activeAlert ? <AlertBox message={demoState.activeAlert} /> : null}
      </div>
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h3 className="text-xl font-black">Nearby at Crossroads</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[...crossroadsParkingLots.slice(0, 1), ...crossroadsAmenities.filter((item) => ["concession", "playground", "gate", "seating"].includes(item.type)).slice(0, 5)].map((item) => (
            <div className="rounded-lg bg-[var(--background)] p-3" key={item.id}>
              <p className="text-sm font-black">{item.label}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{item.type.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FamilyLiveView({ demoState }: { demoState: ReturnType<typeof getCurrentDemoState> }) {
  const game = crossroadsGames.find((item) => item.surfaceCode === "6B") ?? crossroadsGames[0];
  return (
    <div className="grid gap-4">
      {demoState.activeAlert ? <AlertBox message={demoState.activeAlert} /> : null}
      {game ? <CrossroadsGameCard game={{ ...game, status: demoState.field6BStatus }} /> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
        {["Weather: monitoring", "Concession South open", "Restrooms near concourse", "Playground / family area open"].map((item) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm font-black" key={item}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function ScorekeeperView({ demoState }: { demoState: ReturnType<typeof getCurrentDemoState> }) {
  const game = crossroadsGames.find((item) => item.surfaceCode === "6B") ?? crossroadsGames[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      {game ? <CrossroadsGameCard game={{ ...game, status: demoState.field6BStatus }} /> : null}
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-2xl font-black">Scorekeeper controls</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {["Home +1", "Away +1", "Next Inning", "Set Final"].map((item) => (
            <button className="min-h-14 rounded-lg bg-[var(--black-soft)] px-3 text-sm font-black text-white" key={item} type="button">{item}</button>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm font-bold text-[var(--muted)]">Demo-only controls. Production updates require scoped scorekeeper permission and audit logging.</p>
      </div>
    </div>
  );
}

function TournamentView({ demoState }: { demoState: ReturnType<typeof getCurrentDemoState> }) {
  const context = getTournamentModeContext();
  const games = demoState.gamesBehindSchedule ? context.behindGames : context.nextGames.slice(0, 3);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
        <Metric label="Live Fields" value="2" />
        <Metric label="Delayed Fields" value={String(demoState.delayedSurfaceCodes.length)} />
        <Metric label="Behind Games" value={demoState.gamesBehindSchedule ? String(context.behindGames.length) : "0"} />
        <Metric label="Ready Checks" value="18/25" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {games.map((game) => (
          <div className="rounded-lg border border-[var(--line)] bg-white p-4" key={game.id}>
            <CrossroadsGameCard game={{ ...game, status: demoState.delayedSurfaceCodes.includes(game.surfaceCode) ? "delayed" : game.status }} />
            <div className="mt-4"><CrossroadsReadinessChecklist game={game} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VenueOperationsView({ demoState }: { demoState: ReturnType<typeof getCurrentDemoState> }) {
  const context = getVenueOperationsContext();
  return (
    <div className="grid gap-4">
      {demoState.activeAlert ? <AlertBox message={demoState.activeAlert} /> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
        <Metric label="Complex Health" value={demoState.weatherAlertIssued ? "HOLD" : "GOOD"} />
        <Metric label="Field 4" value={demoState.field4Status.toUpperCase()} />
        <Metric label="Field 6B" value={demoState.field6BStatus.toUpperCase()} />
        <Metric label="Announcement" value={demoState.announcementStatus.toUpperCase()} />
      </div>
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-2xl font-black">Equipment placeholders</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {demoState.equipmentPlaceholders.slice(0, 8).map((endpoint) => (
            <div className="rounded-lg bg-[var(--background)] p-3" key={endpoint.id}>
              <p className="text-sm font-black">{endpoint.label}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{endpoint.status}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-bold text-[var(--muted)]">{context.activeAlerts[0]}</p>
      </div>
    </div>
  );
}

function WeatherDelayView({ demoState }: { demoState: ReturnType<typeof getCurrentDemoState> }) {
  const tournament = getTournamentModeContext();
  const affected = demoState.delayedSurfaceCodes.join(", ") || "None";

  return (
    <div className="grid gap-4">
      {demoState.activeAlert ? <AlertBox message={demoState.activeAlert} /> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
        <Metric label="Field Status" value={`4: ${demoState.field4Status.toUpperCase()}`} />
        <Metric label="Family Alert" value={demoState.weatherAlertIssued ? "VISIBLE" : "CLEAR"} />
        <Metric label="Tournament Impact" value={demoState.gamesBehindSchedule ? "BEHIND" : "ON TIME"} />
        <Metric label="Venue Workflow" value={demoState.announcementStatus.toUpperCase()} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Family view</p>
          <h2 className="mt-2 text-2xl font-black">Alert appears above the game</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">Parents scanning Field 6B immediately see which fields are paused and that staff is monitoring conditions.</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Tournament dashboard</p>
          <h2 className="mt-2 text-2xl font-black">{tournament.behindGames.length} games behind</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">Affected surfaces: {affected}. Readiness checks stay visible so staff knows what can restart first.</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Venue operations</p>
          <h2 className="mt-2 text-2xl font-black">Announcement pending</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">Venue owns the delay message and can send an all-clear without tournament staff controlling infrastructure.</p>
        </div>
      </div>
    </div>
  );
}

function GmDashboardView() {
  const priorityKpis = crossroadsExecutiveKpis.slice(0, 8);
  const assetIssues = crossroadsAssets.filter((asset) => asset.status === "offline" || asset.status === "degraded" || asset.status === "maintenance_due");

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
        {priorityKpis.slice(0, 4).map((kpi) => <Metric key={kpi.label} label={kpi.label} value={kpi.value} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Maintenance</p>
          <h2 className="mt-2 text-2xl font-black">4 opened / 3 pending</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">Trash, restroom, wet infield, and scoreboard items become part of one venue operating record.</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Asset health</p>
          <h2 className="mt-2 text-2xl font-black">{assetIssues.length} issues</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">Scoreboard, speaker, lighting, restroom, and netting items can be tracked before they become game-day surprises.</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Revenue opportunities</p>
          <h2 className="mt-2 text-2xl font-black">{crossroadsRevenueOpportunities.length} future cards</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">Sponsorship, concessions, reservations, and signage are marked as future/potential opportunities.</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 break-words text-xl font-black leading-tight md:text-2xl">{value}</p>
    </div>
  );
}

function AlertBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-950">Operations Alert</p>
      <p className="mt-2 text-sm font-bold leading-6 text-amber-950">{message}</p>
    </div>
  );
}
