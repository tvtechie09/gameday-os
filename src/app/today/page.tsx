import { redirect } from "next/navigation";
import {
  canDelayGame,
  canOpenCloseField,
  canSendAnnouncement,
  canStartGame,
} from "@/lib/access/capabilities";
import { flagshipVenueDisplayName } from "@/lib/access/demo-users";
import { getSessionContext } from "@/lib/access/session";
import { QuickActions } from "@/components/access/quick-actions";
import { buildTodayView } from "@/lib/services/venue-operations";
import { timeZoneAbbreviation } from "@/lib/venue-timezone";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  // Session / field statuses
  live: "bg-emerald-500/15 text-emerald-700",
  scheduled: "bg-slate-500/10 text-slate-600",
  delayed: "bg-amber-500/20 text-amber-800",
  maintenance: "bg-red-500/15 text-red-700",
  closed: "bg-red-500/15 text-red-700",
  open: "bg-emerald-500/15 text-emerald-700",
  active: "bg-emerald-500/15 text-emerald-700",
  // Work-order priorities
  urgent: "bg-red-500/15 text-red-700",
  high: "bg-amber-500/20 text-amber-800",
  medium: "bg-sky-500/15 text-sky-700",
  low: "bg-slate-500/10 text-slate-600",
  normal: "bg-slate-500/10 text-slate-600",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${statusStyles[status] ?? "bg-slate-500/10 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default async function TodayPage() {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/dev-login");
  }

  const view = await buildTodayView(ctx);

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: view.timeZone,
  }).format(now);
  // Name the clock we are actually showing instead of asserting "Central Time".
  const zoneLabel = timeZoneAbbreviation(view.timeZone, now);

  const allowed = [
    canStartGame(ctx) ? "start" : null,
    canDelayGame(ctx) ? "delay" : null,
    canSendAnnouncement(ctx) ? "announce" : null,
    canOpenCloseField(ctx) ? "field" : null,
  ].filter((key): key is string => key !== null);

  const venueName = view.venueName ?? ctx.venueName ?? flagshipVenueDisplayName;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1 border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Today&rsquo;s Operations</p>
        <h1 className="text-2xl font-black leading-tight text-[var(--foreground)] sm:text-3xl">{venueName}</h1>
        <p className="text-sm font-semibold text-[var(--muted)]">{dateLabel}{zoneLabel ? ` · ${zoneLabel}` : ""}</p>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Live now", view.health.activeGames],
          ["Delayed", view.health.delayedFields],
          ["Fields", view.health.totalFields],
          ["Maintenance", view.health.maintenanceFields],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-2xl font-black text-[var(--foreground)]">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Quick Actions</h2>
        <div className="mt-3">
          <QuickActions allowed={allowed} targets={view.targets} />
        </div>
      </section>

      {view.alerts.length > 0 ? (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-amber-800">Active Alerts</h2>
          <ul className="mt-2 grid gap-1.5">
            {view.alerts.map((alert) => (
              <li key={alert.id} className="text-sm font-semibold leading-6 text-amber-900">
                <strong>{alert.title}</strong> — {alert.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Live Now</h2>
          <div className="mt-3 grid gap-2">
            {view.liveGames.length === 0 ? (
              <p className="text-sm font-semibold text-[var(--muted)]">No games in progress.</p>
            ) : (
              view.liveGames.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--foreground)]">{g.label}</p>
                    <p className="text-xs font-semibold text-[var(--muted)]">{g.fieldName} · {g.timeLabel}</p>
                  </div>
                  <Badge status="live" />
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Field Status</h2>
          <div className="mt-3 grid gap-2">
            {view.fields.map((field) => (
              <div key={field.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                <p className="text-sm font-black text-[var(--foreground)]">{field.name}</p>
                <Badge status={field.status} />
              </div>
            ))}
            {view.fields.length === 0 ? (
              <p className="text-sm font-semibold text-[var(--muted)]">No fields configured at this venue.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Upcoming Games</h2>
        <div className="mt-3 grid gap-2">
          {view.upcoming.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--muted)]">Nothing scheduled next.</p>
          ) : (
            view.upcoming.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--foreground)]">{g.label}</p>
                  <p className="text-xs font-semibold text-[var(--muted)]">{g.fieldName} · {g.timeLabel}</p>
                </div>
                <Badge status="scheduled" />
              </div>
            ))
          )}
        </div>
      </section>

      {view.workOrders.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Operations Tasks</h2>
          <div className="mt-3 grid gap-2">
            {view.workOrders.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--foreground)]">{task.title}</p>
                  <p className="truncate text-xs font-semibold text-[var(--muted)]">{task.detail}</p>
                </div>
                <Badge status={task.priority} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
