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
import { resolveQuickActionTargets } from "@/lib/services/venue-operations";
import { crossroadsGames, getVenueOperationsContext } from "@/lib/demo/crossroads";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-700",
  warmups: "bg-sky-500/15 text-sky-700",
  scheduled: "bg-slate-500/10 text-slate-600",
  delayed: "bg-amber-500/20 text-amber-800",
  final: "bg-slate-800/10 text-slate-700",
  maintenance: "bg-red-500/15 text-red-700",
  open: "bg-emerald-500/15 text-emerald-700",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${statusStyles[status] ?? "bg-slate-500/10 text-slate-600"}`}>
      {status}
    </span>
  );
}

// Load live venue operations data when Supabase is available, otherwise fall
// back to the Crossroads demo dataset so the page renders without credentials.
function loadOperations() {
  try {
    return getVenueOperationsContext();
  } catch {
    return null;
  }
}

export default async function TodayPage() {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/dev-login");
  }

  const ops = loadOperations();
  const games = ops ? crossroadsGames : [];

  const liveGames = games.filter((g) => g.status === "live" || g.status === "warmups");
  const upcoming = games.filter((g) => g.status === "scheduled").slice(0, 5);
  const delayed = games.filter((g) => g.status === "delayed");

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  }).format(now);

  const allowed = [
    canStartGame(ctx) ? "start" : null,
    canDelayGame(ctx) ? "delay" : null,
    canSendAnnouncement(ctx) ? "announce" : null,
    canOpenCloseField(ctx) ? "field" : null,
  ].filter((key): key is string => key !== null);
  const quickActionTargets = await resolveQuickActionTargets(ctx);

  const venueName = ctx.venueName ?? flagshipVenueDisplayName;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1 border-b border-[var(--line)] pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Today&rsquo;s Operations</p>
        <h1 className="text-2xl font-black leading-tight text-[var(--foreground)] sm:text-3xl">{venueName}</h1>
        <p className="text-sm font-semibold text-[var(--muted)]">{dateLabel} · Central Time</p>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Live now", ops?.health.activeGames ?? liveGames.length],
          ["Delayed", ops?.health.delayedGames ?? delayed.length],
          ["Fields", ops?.health.totalFields ?? "—"],
          ["Maintenance", ops?.health.maintenanceFields ?? 0],
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
          <QuickActions allowed={allowed} targets={quickActionTargets} />
        </div>
      </section>

      {ops && ops.activeAlerts.length > 0 ? (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-amber-800">Weather & Alerts</h2>
          <ul className="mt-2 grid gap-1.5">
            {ops.activeAlerts.map((alert, i) => (
              <li key={i} className="text-sm font-semibold leading-6 text-amber-900">
                {alert}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Live & Warming Up</h2>
          <div className="mt-3 grid gap-2">
            {liveGames.length === 0 ? (
              <p className="text-sm font-semibold text-[var(--muted)]">No games in progress.</p>
            ) : (
              liveGames.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--foreground)]">
                      {g.homeTeam} vs {g.awayTeam}
                    </p>
                    <p className="text-xs font-semibold text-[var(--muted)]">
                      {g.surfaceCode} · {g.startTime} · {g.inning}
                    </p>
                  </div>
                  <Badge status={g.status} />
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Field Status</h2>
          <div className="mt-3 grid gap-2">
            {(ops?.fields ?? []).map((field) => (
              <div key={field.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                <p className="text-sm font-black text-[var(--foreground)]">{field.name}</p>
                <Badge status={field.status} />
              </div>
            ))}
            {(!ops || ops.fields.length === 0) ? (
              <p className="text-sm font-semibold text-[var(--muted)]">Field data unavailable.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Upcoming Games</h2>
        <div className="mt-3 grid gap-2">
          {upcoming.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--muted)]">Nothing scheduled next.</p>
          ) : (
            upcoming.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--foreground)]">
                    {g.homeTeam} vs {g.awayTeam}
                  </p>
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    {g.surfaceCode} · {g.startTime}
                  </p>
                </div>
                <Badge status={g.status} />
              </div>
            ))
          )}
        </div>
      </section>

      {ops && ops.maintenanceRequests.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Operations Tasks</h2>
          <div className="mt-3 grid gap-2">
            {ops.maintenanceRequests.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--foreground)]">{task.title}</p>
                  <p className="truncate text-xs font-semibold text-[var(--muted)]">{task.description}</p>
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
