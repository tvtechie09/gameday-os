import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canDelayGame,
  canManageSchedule,
  canStartGame,
  canViewCommandCenter,
  canViewOpsTasks,
  isOrgScoped,
} from "@/lib/access/capabilities";
import { flagshipVenueDisplayName } from "@/lib/access/demo-users";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { QuickActions } from "@/components/access/quick-actions";
import { buildTodayView } from "@/lib/services/venue-operations";
import { timeZoneAbbreviation } from "@/lib/venue-timezone";
import { alertLevelFor, alertLevelPresentation } from "@/lib/ui/status-presentation";
import { TodayTimeline } from "./today-timeline";
import {
  Card,
  EmptyState,
  PageShell,
  PageTitle,
  ScheduleChangeBanner,
  SectionHeader,
  StatusChip,
  buttonStyles,
  type StatusTone,
} from "@/components/ui/gameday-ui";

export const dynamic = "force-dynamic";

const statusTones: Record<string, StatusTone> = {
  active: "success",
  closed: "danger",
  delayed: "warning",
  high: "warning",
  maintenance: "danger",
  open: "success",
  urgent: "danger",
};

function greetingFor(date: Date, timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone }).format(date));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function alertPresentation(alertType: string) {
  if (alertType === "field_closure") return { title: "FIELD CLOSED", tone: "danger" as const };
  if (alertType === "emergency") return { title: "URGENT UPDATE", tone: "danger" as const };
  if (alertType === "delay") return { title: "START DELAYED", tone: "warning" as const };
  if (alertType === "weather") return { title: "WEATHER UPDATE", tone: "warning" as const };
  return { title: "VENUE UPDATE", tone: "warning" as const };
}

export default async function TodayPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/dev-login");
  if (isOrgScoped(ctx)) redirect(getRoleHome(ctx));
  if (!canViewOpsTasks(ctx)) redirect("/no-access");

  const view = await buildTodayView(ctx);
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: view.timeZone }).format(now);
  const zoneLabel = timeZoneAbbreviation(view.timeZone, now);
  const firstName = (ctx.displayName || ctx.roleLabel).trim().split(/\s+/)[0];
  const venueName = view.venueName ?? ctx.venueName ?? flagshipVenueDisplayName;
  const fieldAttention = view.fields.filter((field) => ["closed", "delayed", "maintenance"].includes(field.status)).length;
  const needsAttention = fieldAttention + view.alerts.length + view.workOrders.length;
  const activeFields = view.fields.filter((field) => field.status === "active" || field.status === "open").length;
  const isVenueOperator = canViewCommandCenter(ctx);

  const allowed = [
    canStartGame(ctx) ? "start" : null,
    canDelayGame(ctx) ? "delay" : null,
  ].filter((key): key is string => key !== null);

  if (!view.venueId) {
    return (
      <PageShell size="compact">
        <PageTitle description={`${dateLabel}${zoneLabel ? ` · ${zoneLabel}` : ""}`} eyebrow="Today" title="No venue available" />
        <EmptyState className="mt-8" message="Your account does not currently resolve to a venue with a schedule." title="Nothing to operate yet" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageTitle description={`${dateLabel}${zoneLabel ? ` · ${zoneLabel}` : ""}`} eyebrow={ctx.roleKey === "tournament_director" ? "Tournament day" : "Today’s operations"} title={`${greetingFor(now, view.timeZone)}, ${firstName}`} />

      <section className="mt-6 rounded-2xl bg-[var(--black-soft)] p-5 text-white shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">Today at {venueName}</p>
        <h2 className="mt-3 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">
          {view.events.length === 0 ? "No games are scheduled today." : `${view.events.length} event${view.events.length === 1 ? "" : "s"}, with ${view.health.activeGames} live now.`}
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/75">
          {needsAttention > 0
            ? `${needsAttention} item${needsAttention === 1 ? " needs" : "s need"} attention. ${activeFields} of ${view.health.totalFields} fields are open or active.`
            : `Nothing needs attention right now. ${activeFields} of ${view.health.totalFields} fields are open or active.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a className={buttonStyles("secondary", "bg-white ring-0 hover:bg-white/90")} href="#today-timeline">View today’s schedule</a>
          {isVenueOperator ? <Link className={buttonStyles("quiet", "border border-white/20 bg-white/10 text-white hover:bg-white/15")} href="/admin/fields">Check fields</Link> : null}
          {canManageSchedule(ctx) ? <Link className={buttonStyles("quiet", "border border-white/20 bg-white/10 text-white hover:bg-white/15")} href="/admin/sessions">Change schedule</Link> : null}
        </div>
      </section>

      {view.alerts.length > 0 ? (
        <section className="mt-6">
          <SectionHeader description="Current schedule, field, and venue notices." title="Latest updates" />
          <div className="mt-3 grid gap-3">
            {view.alerts.map((alert) => {
              const presentation = alertPresentation(alert.alertType);
              const level = alertLevelPresentation(alertLevelFor(alert.priority, alert.alertType));
              return <ScheduleChangeBanner key={alert.id} title={`${level.label} · ${presentation.title}`} tone={level.tone as "info" | "warning" | "danger"}><strong>{alert.title}</strong> — {alert.message}</ScheduleChangeBanner>;
            })}
          </div>
        </section>
      ) : null}

      {allowed.length > 0 ? (
        <Card className="mt-6 p-4 sm:p-5">
          <SectionHeader description="Only actions allowed for your role appear here." title="Quick actions" />
          <div className="mt-3"><QuickActions allowed={allowed} targets={view.targets} /></div>
        </Card>
      ) : null}

      <section className="mt-7" id="today-timeline">
        <SectionHeader description="A chronological view of what is happening now and what comes next." title="Today" />
        <div className="mt-4"><TodayTimeline events={view.events} now={now.getTime()} timeZone={view.timeZone} venueName={venueName} /></div>
      </section>

      {isVenueOperator && view.workOrders.length > 0 ? (
        <section className="mt-8">
          <SectionHeader action={<Link className="text-sm font-black text-[var(--accent-strong)]" href="/admin/fields/work-orders">View all</Link>} description="Open operational issues at this venue." title="Needs attention" />
          <div className="mt-3 grid gap-2">
            {view.workOrders.map((task) => (
              <Link className="flex min-h-14 min-w-0 items-center justify-between gap-3 overflow-hidden rounded-lg border border-[var(--line)] bg-white p-3" href="/admin/fields/work-orders" key={task.id}>
                <span className="min-w-0 flex-1 overflow-hidden"><span className="block truncate text-sm font-black">{task.title}</span><span className="block truncate text-xs font-semibold text-[var(--muted)]">{task.detail}</span></span>
                <StatusChip tone={statusTones[task.priority] ?? "neutral"}>{task.priority}</StatusChip>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
