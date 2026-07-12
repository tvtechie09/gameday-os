import Link from "next/link";
import type { ReactNode } from "react";
import {
  getCrossroadsMediaEngineContext,
} from "@/lib/demo/crossroads-media";
import { canControlCamera, isProductionCamera, type DistributionEndpoint, type MediaChannel, type VideoSource } from "@/lib/media-engine";

export function MediaEngineOverview() {
  const context = getCrossroadsMediaEngineContext();
  const streamableSources = context.videoSources.filter(isProductionCamera);
  const securitySources = context.videoSources.filter((source) => source.isSecurityCamera);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Video Sources" value={String(context.videoSources.length)} />
        <Metric label="Streamable Demo Sources" value={String(streamableSources.length)} />
        <Metric label="Active Channels" value={String(context.channels.filter((channel) => channel.status === "active").length)} />
        <Metric label="Endpoints" value={String(context.distributionEndpoints.length)} />
        <Metric label="Overlay Templates" value={String(context.overlayTemplates.length)} />
      </section>

      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">GameDay Media Engine</p>
        <h2 className="mt-2 text-2xl font-black">Create media once, distribute it everywhere.</h2>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-6 text-[var(--muted)]">
          GameDay OS orchestrates mock camera feeds, normalized game state, score overlays, venue channels, and distribution endpoints. It does not replace GameChanger, Daktronics, camera vendors, OBS, streaming platforms, or signage systems.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <VideoSourceHealth sources={context.videoSources} />
        <OverlayPreviewCard />
      </section>

      <MediaChannelsGrid channels={context.channels} />
      <DistributionEndpointGrid endpoints={context.distributionEndpoints} channels={context.channels} />
      <RoutingMatrix />

      {securitySources.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-950">Safety boundary</p>
          <h2 className="mt-2 text-2xl font-black text-amber-950">Security cameras are not livestream sources</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
            Security cameras are modeled for awareness only. They are separated from production cameras and are not routed to family apps, venue TVs, or livestream destinations.
          </p>
        </section>
      ) : null}
    </div>
  );
}

export function VideoSourceHealth({ sources }: { sources: VideoSource[] }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Video Source Health</p>
      <div className="mt-4 grid gap-3">
        {sources.map((source) => (
          <article className="rounded-lg bg-[var(--background)] p-4" key={source.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{source.name}</h3>
                <p className="mt-1 text-sm font-bold text-[var(--muted)]">{source.locationType} · {source.locationId}</p>
              </div>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{source.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{source.notes}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>{source.sourceType}</Chip>
              <Chip>{source.provider}</Chip>
              {source.supportsPtz ? <Chip>PTZ future</Chip> : null}
              {source.isSecurityCamera ? <Chip>security awareness only</Chip> : <Chip>production/demo</Chip>}
              {canControlCamera("parent", source) ? null : <Chip>parent cannot control</Chip>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OverlayPreviewCard() {
  const context = getCrossroadsMediaEngineContext();
  const preview = context.overlayPreview;

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-green-200">Overlay Preview</p>
      <h2 className="mt-2 text-2xl font-black">{preview.title}</h2>
      <div className="mt-5 rounded-lg bg-black/40 p-4">
        {preview.emergencyBanner ? <p className="rounded-md bg-amber-300 px-3 py-2 text-sm font-black text-black">{preview.emergencyBanner}</p> : null}
        <div className="mt-4 grid gap-2">
          {preview.lines.map((line) => <p className="text-lg font-black" key={line}>{line}</p>)}
        </div>
        {preview.sponsorPlacement ? <p className="mt-4 rounded-md bg-white/10 px-3 py-2 text-sm font-black">{preview.sponsorPlacement}</p> : null}
        <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-white/60">{preview.poweredBy}</p>
      </div>
    </section>
  );
}

export function MediaChannelsGrid({ channels }: { channels: MediaChannel[] }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Active Channels</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {channels.map((channel) => (
          <Link className="rounded-lg bg-[var(--background)] p-4 hover:bg-[var(--accent-soft)]" href={`/demo/crossroads/media/channel/${channel.id}`} key={channel.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-black">{channel.name}</h3>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{channel.status}</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{channel.description}</p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.08em] text-[var(--accent-strong)]">{channel.contentTypes.join(" · ").replaceAll("_", " ")}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DistributionEndpointGrid({ channels, endpoints }: { channels: MediaChannel[]; endpoints: DistributionEndpoint[] }) {
  const channelById = new Map(channels.map((channel) => [channel.id, channel]));

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Distribution Endpoints</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {endpoints.map((endpoint) => (
          <article className="rounded-lg bg-[var(--background)] p-4" key={endpoint.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-black">{endpoint.name}</h3>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{endpoint.status}</span>
            </div>
            <p className="mt-2 text-sm font-bold text-[var(--muted)]">{endpoint.endpointType.replaceAll("_", " ")}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{endpoint.notes}</p>
            <p className="mt-3 rounded-lg bg-white p-3 text-sm font-black">
              {endpoint.activeChannelId ? channelById.get(endpoint.activeChannelId)?.name ?? endpoint.activeChannelId : "No active channel"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RoutingMatrix() {
  const context = getCrossroadsMediaEngineContext();
  const channelById = new Map(context.channels.map((channel) => [channel.id, channel]));
  const endpointById = new Map(context.distributionEndpoints.map((endpoint) => [endpoint.id, endpoint]));

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Routing Matrix</p>
      <div className="mt-4 grid gap-3">
        {context.routes.map((route) => (
          <article className="grid gap-3 rounded-lg bg-[var(--background)] p-4 md:grid-cols-[1fr_1fr_auto]" key={route.id}>
            <div>
              <p className="text-sm font-bold text-[var(--muted)]">Channel</p>
              <p className="font-black">{channelById.get(route.channelId)?.name ?? route.channelId}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--muted)]">Endpoint</p>
              <p className="font-black">{endpointById.get(route.endpointId)?.name ?? route.endpointId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{route.status}</Chip>
              <Chip>{route.priority}</Chip>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MediaSafeguardsPanel() {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Safeguards</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          "Emergency content can override normal media channels.",
          "Camera control is future and permission-restricted.",
          "Livestream destinations are future integrations.",
          "Security cameras are not treated as streamable production cameras.",
          "No GameChanger, Daktronics, RTMP, YouTube, OBS, or signage systems are connected.",
          "Parent/family users cannot manage media routes or overlays.",
        ].map((item) => <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold" key={item}>{item}</p>)}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{children}</span>;
}
