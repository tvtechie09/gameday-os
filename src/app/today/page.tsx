import Link from "next/link";
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
import { TodayFieldStatusControl } from "./today-field-status-control";
import { AlertBanner, Card, PageShell, PageTitle, SectionHeader, StatusChip, type StatusTone } from "@/components/ui/gameday-ui";

export const dynamic = "force-dynamic";

const statusTones: Record<string, StatusTone> = {
  active: "success",
  closed: "danger",
  delayed: "warning",
  high: "warning",
  live: "success",
  maintenance: "danger",
  medium: "info",
  open: "success",
  urgent: "danger",
};

function Badge({ status }: { status: string }) {
  return <StatusChip tone={statusTones[status] ?? "neutral"}>{status.replaceAll("_", " ")}</StatusChip>;
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
    <PageShell>
      <PageTitle description={`${dateLabel}${zoneLabel ? ` · ${zoneLabel}` : ""}`} eyebrow="Today’s Operations" title={venueName} />

      <section className="mt-5 grid gap-3 sm:grid-cols-4">
        <Link className="rounded-xl border border-[var(--line)] bg-white p-4 transition hover:border-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2" href="#live-now">
          <p className="text-2xl font-black text-[var(--foreground)]">{view.health.activeGames}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Live now</p>
          <p className="mt-2 text-xs font-black text-emerald-700">View details ↓</p>
        </Link>
        {[
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

      <Card className="mt-6 p-4 sm:p-5">
        <SectionHeader description="Common day-of changes, based on your access." title="Quick actions" />
        <div className="mt-3">
          <QuickActions allowed={allowed} targets={view.targets} />
        </div>
      </Card>

      {view.alerts.length > 0 ? (
        <AlertBanner className="mt-6" title="Active alerts" tone="warning">
          <ul className="mt-2 grid gap-1.5">
            {view.alerts.map((alert) => (
              <li key={alert.id} className="text-sm font-semibold leading-6 text-amber-900">
                <strong>{alert.title}</strong> — {alert.message}
              </li>
            ))}
          </ul>
        </AlertBanner>
      ) : null}

      <div className="mt-6 grid gap-6">
        <section id="live-now">
          <SectionHeader description="Tap a game for score and field details." title="Live now" />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {view.liveGames.length === 0 ? (
              <p className="text-sm font-semibold text-[var(--muted)]">No games in progress.</p>
            ) : (
              view.liveGames.map((g) => (
                <details key={g.id} className="group rounded-lg border border-[var(--line)] bg-white">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-3 focus-visible:outline-2 focus-visible:outline-offset-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--foreground)]">{g.label}</p>
                      <p className="text-xs font-semibold text-[var(--muted)]">{g.fieldName} · {g.timeLabel}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge status="live" />
                      <span aria-hidden="true" className="text-sm font-black text-[var(--muted)] transition group-open:rotate-180">⌄</span>
                    </span>
                  </summary>
                  <div className="border-t border-[var(--line)] p-3">
                    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                      <span className="font-bold">{g.homeTeam}</span>
                      <span className="text-lg font-black tabular-nums">{g.homeScore}</span>
                      <span className="font-bold">{g.awayTeam}</span>
                      <span className="text-lg font-black tabular-nums">{g.awayScore}</span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                      {g.sportType} · {g.lifecycleStatus.replaceAll("_", " ")}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--black-soft)] px-3 text-xs font-black text-white" href={`/scoreboard/${g.id}`}>
                        View live scoreboard
                      </Link>
                      <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] px-3 text-xs font-black" href={`/fields/${g.fieldId}`}>
                        View field page
                      </Link>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHeader description="Make quick status changes without leaving Today." title="Field status" />
          <div className="mt-3 grid gap-2">
            {view.fields.map((field) => (
              <div key={field.id} className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)] sm:items-center">
                <p className="text-sm font-black text-[var(--foreground)]">{field.name}</p>
                {canOpenCloseField(ctx) ? (
                  <TodayFieldStatusControl fieldId={field.id} fieldName={field.name} initialStatus={field.status} />
                ) : (
                  <div className="sm:justify-self-end"><Badge status={field.status} /></div>
                )}
              </div>
            ))}
            {view.fields.length === 0 ? (
              <p className="text-sm font-semibold text-[var(--muted)]">No fields configured at this venue.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <SectionHeader title="Upcoming games" />
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
          <SectionHeader title="Operations tasks" />
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
    </PageShell>
  );
}
