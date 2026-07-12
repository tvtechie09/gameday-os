import Image from "next/image";
import Link from "next/link";
import { CrossroadsMap } from "@/components/crossroads/crossroads-map";
import { CrossroadsGameCard, CrossroadsModeLinks, CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import {
  crossroadsEquipmentEndpoints,
  crossroadsFields,
  crossroadsGames,
  crossroadsHotspots,
  crossroadsPlaySurfaces,
  crossroadsQrEntries,
  crossroadsVenue,
  getVenueOperationsContext,
} from "@/lib/demo/crossroads";

export const dynamic = "force-dynamic";

export default function CrossroadsVenuePage() {
  const liveGames = crossroadsGames.filter((game) => game.status === "live");
  const delayedGames = crossroadsGames.filter((game) => game.status === "delayed");
  const operationsContext = getVenueOperationsContext();

  return (
    <CrossroadsPageShell actions={<CrossroadsModeLinks />} eyebrow="Venue Mode" title={crossroadsVenue.name}>
      <section className="relative mb-6 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--black-soft)]">
        <div className="relative min-h-[260px]">
          <Image alt={`${crossroadsVenue.name} hero`} className="object-cover opacity-80" fill priority sizes="100vw" src={crossroadsVenue.heroImageUrl} unoptimized />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">GameDay OS · Connected Venue Operating System</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-black sm:text-5xl">Crossroads as the flagship connected municipal venue.</h2>
            <Link className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-black text-black" href="/demo/crossroads/today">
              Open Crossroads Today
            </Link>
            <Link className="ml-0 mt-3 inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-5 py-3 text-sm font-black text-white sm:ml-3" href="/demo/crossroads/presentation">
              Start Crossroads Tour
            </Link>
            <Link className="ml-0 mt-3 inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-5 py-3 text-sm font-black text-white sm:ml-3" href="/demo/crossroads/gm">
              Open Operations Summary
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Fields" value={crossroadsFields.length} />
        <Metric label="Play Surfaces" value={crossroadsPlaySurfaces.length} />
        <Metric label="Live Games" value={liveGames.length} />
        <Metric label="Delayed Games" value={delayedGames.length} />
      </div>

      <section className="mt-6">
        <CrossroadsMap hotspots={crossroadsHotspots} mapImageUrl={crossroadsVenue.mapImageUrl} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Today</p>
              <h2 className="mt-1 text-2xl font-black">Schedule by play surface</h2>
            </div>
            <span className="text-sm font-bold text-[var(--muted)]">{crossroadsGames.length} demo games</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {crossroadsGames.slice(0, 8).map((game) => <CrossroadsGameCard game={game} key={game.id} />)}
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">QR Entry Points</p>
          <h2 className="mt-1 text-2xl font-black">Demo routes</h2>
          <div className="mt-4 grid gap-3">
            {[...crossroadsQrEntries.slice(0, 14), ...operationsContext.maintenanceQrEntries.slice(0, 6)].map((entry) => (
              <Link className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold hover:bg-[var(--accent-soft)]" href={entry.route} key={entry.id}>
                {entry.label}
                <span className="mt-1 block break-all text-xs text-[var(--muted)]">{entry.route}</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Provider-ready equipment</p>
        <h2 className="mt-1 text-2xl font-black">No real vendor integrations</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
          Crossroads demo equipment endpoints are placeholders for scoreboards, speakers, cameras/security, network, and lights. Daktronics, Cisco, Meraki, Cisco Spaces, Axis, and other vendor APIs are not called.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["scoreboard", "speaker", "camera/security", "network", "lights"].map((item) => (
            <span className="rounded-md bg-white/10 px-3 py-2 text-sm font-black" key={item}>{item}</span>
          ))}
        </div>
        <p className="mt-4 text-sm font-bold text-white/60">{crossroadsEquipmentEndpoints.length} placeholder endpoints configured in local demo data.</p>
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
