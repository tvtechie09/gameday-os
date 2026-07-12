import Image from "next/image";
import Link from "next/link";
import {
  CommunityDashboard,
  DisplayChannelsPanel,
  FutureVisionPhasesPanel,
  QrContextDemo,
  VisitorServicesPanel,
} from "@/components/crossroads/mayor-demo-panels";
import { CrossroadsGameCard, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { getCrossroadsTodayContext } from "@/lib/demo/crossroads-mayor";
import { crossroadsGames } from "@/lib/demo/crossroads";

export const dynamic = "force-dynamic";

export default function CrossroadsTodayPage() {
  const context = getCrossroadsTodayContext();
  const liveGames = crossroadsGames.filter((game) => game.status === "live");
  const delayedGames = crossroadsGames.filter((game) => game.status === "delayed");

  return (
    <main className="min-h-screen bg-[var(--background)] text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-lg border border-black/10 bg-[var(--black-soft)]">
          <div className="relative min-h-[360px]">
            <Image alt={`${context.venue.name} map`} className="object-cover opacity-80" fill priority sizes="100vw" src={context.venue.heroImageUrl} unoptimized />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-green-200">GameDay OS · Connected Venue Operating System</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-normal sm:text-6xl">Welcome to Wintrust Crossroads</h1>
              <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-white/85">
                Today&apos;s live venue view for families, tournament directors, staff, and Village leadership.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-5 text-sm font-black text-black" href="/demo/crossroads/presentation">Start Presentation Tour</Link>
                <Link className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-5 text-sm font-black text-white" href="/venue/crossroads">Open Venue Map</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Today's Event" value={context.eventTitle} />
          <Metric label="Games Today" value={String(context.gamesToday)} />
          <Metric label="Visitors Estimate" value={context.visitorEstimate} />
          <Metric label="Live Fields" value={String(context.liveFields.length)} />
          <Metric label="Delayed Fields" value={String(context.delayedFields.length)} />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <div className="rounded-lg border border-[var(--line)] bg-white p-5">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Today at Crossroads</p>
            <h2 className="mt-2 text-2xl font-black">Live venue snapshot</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {liveGames.concat(delayedGames).slice(0, 4).map((game) => (
                <CrossroadsGameCard game={game} key={game.id} />
              ))}
            </div>
          </div>

          <aside className="grid gap-5">
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-950">Weather placeholder</p>
              <p className="mt-2 text-lg font-black text-amber-950">{context.weather}</p>
              <p className="mt-3 text-sm font-bold text-amber-900">No live weather or lightning API is connected in this demo.</p>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Announcements</p>
              <div className="mt-4 grid gap-3">
                {context.announcements.map((announcement) => (
                  <div className="rounded-lg bg-[var(--background)] p-3" key={announcement.id}>
                    <p className="font-black">{announcement.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{announcement.message}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Quick links</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <QuickLink href="/venue/crossroads/family" label="Family Experience" />
            <QuickLink href="/venue/crossroads/tournament" label="Tournament Operations" />
            <QuickLink href="/demo/crossroads/operations" label="Operations Center" />
            <QuickLink href="/demo/crossroads/staff" label="Staff Mode" />
            <QuickLink href="/demo/crossroads/tv" label="TV Dashboard" />
            <QuickLink href="/demo/crossroads/presentation" label="Presentation Tour" />
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {context.liveFields.slice(0, 3).map((field) => (
            <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={field.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black">{field.name}</h3>
                <CrossroadsStatusBadge status={field.status} />
              </div>
              <p className="mt-3 text-sm font-bold text-[var(--muted)]">{field.surfaces.length} configured play surfaces</p>
            </article>
          ))}
        </section>

        <section className="mt-6">
          <VisitorServicesPanel compact />
        </section>

        <section className="mt-6">
          <QrContextDemo />
        </section>

        <section className="mt-6">
          <DisplayChannelsPanel />
        </section>

        <section className="mt-6">
          <CommunityDashboard />
        </section>

        <section className="mt-6">
          <FutureVisionPhasesPanel />
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-center text-sm font-black text-white" href={href}>
      {label}
    </Link>
  );
}
