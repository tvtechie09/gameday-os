import Link from "next/link";
import type { ReactNode } from "react";
import {
  displayChannels,
  futureVisionPhases,
  getCommunityDashboardContext,
  operationsCenterTabs,
  qrContextViews,
  visitorServices,
} from "@/lib/demo/crossroads-mayor";

export function VisitorServicesPanel({ compact = false }: { compact?: boolean }) {
  const services = compact ? visitorServices.slice(0, 6) : visitorServices;

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5" data-demo-section="visitor-services">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Visitor Services</p>
      <h2 className="mt-2 text-2xl font-black">Everything a family needs to find quickly</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black">{service.title}</h3>
                <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{service.category.replace("_", " ")}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-[var(--muted)]">{service.location}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{service.note}</p>
            </>
          );

          return service.route ? (
            <Link className="rounded-lg bg-[var(--background)] p-4 hover:bg-[var(--accent-soft)]" href={service.route} key={service.id}>
              {body}
            </Link>
          ) : (
            <article className="rounded-lg bg-[var(--background)] p-4" key={service.id}>
              {body}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function QrContextDemo() {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5" data-demo-section="qr-context">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">QR Context Demo</p>
      <h2 className="mt-2 text-2xl font-black">Scan at Field 6</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
        One QR location can resolve to different destinations based on role. This is a visual demo only; QR generation and identity routing use existing platform foundations.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {qrContextViews.map((view) => (
          <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={view.id}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{view.role}</p>
            <h3 className="mt-2 text-xl font-black">{view.title}</h3>
            <div className="mt-4 grid gap-2">
              {view.items.map((item) => (
                <p className="rounded-lg bg-white p-3 text-sm font-bold" key={item}>{item}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CommunityDashboard() {
  const community = getCommunityDashboardContext();

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5" data-demo-section="community-dashboard">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Community Dashboard</p>
      <h2 className="mt-2 text-2xl font-black">Village, visitor, sponsor, and event messaging</h2>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Crossroads event calendar">
          {community.events.map((event) => (
            <InfoRow eyebrow={event.dateLabel} key={event.id} title={event.title}>
              {event.note}
            </InfoRow>
          ))}
        </Panel>
        <Panel title="Community announcements">
          {community.announcements.map((announcement) => (
            <InfoRow eyebrow={announcement.status} key={announcement.id} title={announcement.title}>
              {announcement.message}
            </InfoRow>
          ))}
        </Panel>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <InfoCard title="Explore New Lenox" eyebrow="tourism placeholder">
          Visitor messaging can point tournament families toward local restaurants, hotels, parks, and Village events after games.
        </InfoCard>
        <InfoCard title="Sponsor/community partners" eyebrow="partner highlights">
          {community.partnerHighlights.map((partner) => partner.title).join(", ")}
        </InfoCard>
        <InfoCard title="Display reach" eyebrow="venue channels">
          {community.displayZones.length} demo display zones can carry approved community, sponsor, schedule, and safety messages.
        </InfoCard>
      </div>
    </section>
  );
}

export function DisplayChannelsPanel({ dark = false }: { dark?: boolean }) {
  return (
    <section className={dark ? "rounded-2xl border border-white/10 bg-white/[0.08] p-5" : "rounded-lg border border-[var(--line)] bg-white p-5"} data-demo-section="display-channels">
      <p className={dark ? "text-xs font-black uppercase tracking-[0.16em] text-green-300" : "text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]"}>Venue Channels</p>
      <h2 className={dark ? "mt-2 text-2xl font-black text-white" : "mt-2 text-2xl font-black"}>Demo playlists for TVs and displays</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {displayChannels.map((channel) => (
          <article className={dark ? "rounded-xl bg-black/25 p-4" : "rounded-lg bg-[var(--background)] p-4"} key={channel.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className={dark ? "font-black text-white" : "font-black"}>{channel.name}</h3>
              <span className={dark ? "rounded-md bg-white/10 px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-white/70" : "rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]"}>{channel.status}</span>
            </div>
            <p className={dark ? "mt-2 text-sm font-bold leading-6 text-white/70" : "mt-2 text-sm font-bold leading-6 text-[var(--muted)]"}>{channel.description}</p>
          </article>
        ))}
      </div>
      <p className={dark ? "mt-4 text-xs font-bold uppercase tracking-[0.12em] text-white/50" : "mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]"}>
        Demo playlists only. Digital signage control requires future partner/vendor approval.
      </p>
    </section>
  );
}

export function FutureVisionPhasesPanel() {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5" data-demo-section="future-phases">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Future Vision</p>
      <h2 className="mt-2 text-2xl font-black">Crossroads 2030 phases</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {futureVisionPhases.map((phase) => (
          <article className="rounded-lg bg-[var(--background)] p-4" key={phase.id}>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{phase.label}</p>
            <h3 className="mt-2 text-lg font-black">{phase.title}</h3>
            <div className="mt-4 grid gap-2">
              {phase.items.map((item) => (
                <div className="rounded-lg bg-white p-3" key={item.title}>
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{item.status}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OperationsTabSummary() {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5" data-demo-section="operations-tabs">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Operations Center</p>
      <h2 className="mt-2 text-2xl font-black">A complete venue story in one operating view</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {operationsCenterTabs.map((tab) => (
          <span className="shrink-0 rounded-lg border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm font-black" key={tab}>{tab}</span>
        ))}
      </div>
    </section>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <article className="rounded-lg bg-[var(--background)] p-4">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </article>
  );
}

function InfoCard({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <article className="rounded-lg bg-[var(--background)] p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{children}</p>
    </article>
  );
}

function InfoRow({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <article className="rounded-lg bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-black">{title}</h4>
        <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{eyebrow}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{children}</p>
    </article>
  );
}
