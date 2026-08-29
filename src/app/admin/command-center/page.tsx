import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManagePlatform, isPlatformAdmin } from "@/lib/access/capabilities";
import { buildCommandCenter, type AttentionItem, type AttentionTier, type CommandCenterMode, type FieldBoardEntry, type SchedulePulse } from "@/lib/services/command-center";
import { LiveScore } from "@/app/fields/[fieldId]/live-score";
import { ModeChecklistCard } from "./mode-checklist";
import { refreshDemoDayAction } from "./actions";
import { timeZoneAbbreviation } from "@/lib/venue-timezone";

export const dynamic = "force-dynamic";

const modeCaption: Record<CommandCenterMode, { label: string; caption: string }> = {
  pregame: { label: "Pre-game · Readiness", caption: "Games haven't started. Confirm fields, officials, and systems before first pitch." },
  live: { label: "Live operations", caption: "Games are in progress. Work the attention queue top-down." },
  postgame: { label: "End of day · Closing", caption: "All games are done. Confirm finals, secure fields, and generate the daily report." },
};

const tierMeta: Record<AttentionTier, { label: string; card: string; chip: string }> = {
  urgent: { label: "Urgent", card: "border-red-300 bg-red-50", chip: "bg-red-600 text-white" },
  soon: { label: "Action needed soon", card: "border-amber-300 bg-amber-50", chip: "bg-amber-500 text-white" },
  info: { label: "Information", card: "border-[var(--line)] bg-white", chip: "bg-slate-500 text-white" },
};

const fieldStatusMeta: Record<string, { dot: string; ring: string; label: string }> = {
  open: { dot: "bg-emerald-500", ring: "border-emerald-200", label: "Normal" },
  delayed: { dot: "bg-amber-500", ring: "border-amber-300", label: "Delayed" },
  closed: { dot: "bg-red-500", ring: "border-red-300", label: "Closed" },
  maintenance: { dot: "bg-red-500", ring: "border-red-300", label: "Maintenance" },
};

// Venue-wide schedule health. Hidden once nothing is in play or pending — at
// that point "are we on schedule" has no meaning and the tiles would be noise.
function SchedulePulseCard({ pulse }: { pulse: SchedulePulse }) {
  if (pulse.tracked === 0) return null;
  const bands: Array<{ label: string; value: number; tone?: string }> = [
    { label: "On time", value: pulse.onTime, tone: "text-emerald-600" },
    { label: "1–10 min", value: pulse.late1to10 },
    { label: "11–20 min", value: pulse.late11to20, tone: pulse.late11to20 > 0 ? "text-amber-700" : undefined },
    { label: "20+ min", value: pulse.late20plus, tone: pulse.late20plus > 0 ? "text-red-700" : undefined },
  ];

  return (
    <section className="mt-7 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Schedule Pulse</h2>
        <p className="text-xs font-bold text-[var(--muted)]">
          {pulse.tracked} game{pulse.tracked === 1 ? "" : "s"} in play or pending · avg {pulse.averageDelayMin} min behind
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {bands.map((band) => (
          <div key={band.label} className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
            <p className={`text-2xl font-black leading-none tabular-nums ${band.tone ?? ""}`}>{band.value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{band.label}</p>
          </div>
        ))}
      </div>

      {pulse.worstFields.length > 0 ? (
        <p className="mt-4 text-sm font-semibold text-[var(--muted)]">
          Worst hit:{" "}
          {pulse.worstFields.map((f, i) => (
            <span key={f.fieldName}>
              {i > 0 ? " · " : ""}
              <b className="text-[var(--foreground)]">{f.fieldName}</b> {f.minutesBehind} min
            </span>
          ))}
          {pulse.recoveryMinutes > 0 ? <> · back on schedule in ~{pulse.recoveryMinutes} min if nothing changes</> : null}
        </p>
      ) : null}

      {pulse.downstreamImpacts.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Projected knock-on (estimate)</p>
          <ul className="mt-2 grid gap-1.5">
            {pulse.downstreamImpacts.map((impact) => (
              <li key={impact.fieldName + impact.nextGameLabel} className="text-sm font-semibold">
                <b>{impact.fieldName}</b> · {impact.nextGameLabel}:{" "}
                <span className="text-[var(--muted)] line-through">{impact.scheduledStartLabel}</span>{" "}
                <span className="text-amber-700">{impact.projectedStartLabel}</span>{" "}
                <span className="text-xs text-[var(--muted)]">({impact.minutesLate} min late)</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pulse.curfewRisks.length > 0 ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-800">Curfew risk (estimate)</p>
          <ul className="mt-1.5 grid gap-1">
            {pulse.curfewRisks.map((risk) => (
              <li key={risk.fieldName + risk.gameLabel} className="text-sm font-bold text-red-900">
                {risk.fieldName} · {risk.gameLabel} projected {risk.projectedFinishLabel} — {risk.minutesPastClose} min past close
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <p className={`text-2xl font-black leading-none ${tone ?? "text-[var(--foreground)]"}`}>{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const meta = tierMeta[item.tier];
  return (
    <article className={`rounded-xl border p-4 ${meta.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${meta.chip}`}>{meta.label}</span>
        {item.fieldName ? <span className="rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">{item.fieldName}</span> : null}
      </div>
      <h3 className="mt-2 text-base font-black leading-snug text-[var(--foreground)]">{item.title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.why}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-[var(--foreground)]">→ {item.action}</p>
        {item.href ? (
          <Link href={item.href} className="inline-flex min-h-9 items-center rounded-lg bg-[var(--black-soft)] px-3 text-xs font-black text-white">
            Open
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function FieldCard({ entry }: { entry: FieldBoardEntry }) {
  const meta = fieldStatusMeta[entry.status] ?? { dot: "bg-slate-400", ring: "border-[var(--line)]", label: entry.status };
  const game = entry.currentGame;
  const isLive = game ? game.lifecycleStatus === "live" || game.lifecycleStatus === "suspended" : false;
  return (
    <article className={`rounded-xl border bg-white p-4 ${meta.ring}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <h3 className="text-sm font-black text-[var(--foreground)]">{entry.fieldName}</h3>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">{meta.label}</span>
      </div>

      {game ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-bold text-[var(--foreground)]">{game.label}</p>
            {isLive ? (
              <LiveScore gameId={game.id} initialHome={game.scoreHome} initialAway={game.scoreAway} className="shrink-0 text-sm font-black text-[var(--foreground)]" />
            ) : (
              <p className="shrink-0 text-sm font-black text-[var(--foreground)]">{game.scoreHome}-{game.scoreAway}</p>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
            {isLive ? "Live" : "Scheduled"} · started {game.startLabel}
            {game.minutesBehind > 0 ? <span className="text-amber-700"> · {game.minutesBehind} min behind</span> : null}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-[var(--muted)]">No game in progress.</p>
      )}

      {entry.nextGame ? (
        <p className="mt-3 border-t border-[var(--line)] pt-2 text-xs font-semibold text-[var(--muted)]">
          Next: <span className="text-[var(--foreground)]">{entry.nextGame.label}</span> · {entry.nextGame.startLabel}
          {!entry.officialsConfirmed ? <span className="text-amber-700"> · no confirmed umpire</span> : null}
        </p>
      ) : null}

      {entry.recommendedAction ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">{entry.recommendedAction}</p>
      ) : null}
    </article>
  );
}

export default async function CommandCenterPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/dev-login");

  const view = await buildCommandCenter(ctx);
  const mode = modeCaption[view.mode];
  const s = view.summary;

  const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: view.timeZone }).format(new Date());
  const generatedLabel = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: view.timeZone }).format(new Date(view.generatedAt));

  const urgent = view.attention.filter((i) => i.tier === "urgent");
  const soon = view.attention.filter((i) => i.tier === "soon");
  const info = view.attention.filter((i) => i.tier === "info");

  if (!view.venueId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-black">Command Center</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">No venue is available for your account yet. Create a venue to begin operating.</p>
        <Link href="/admin/venues/new" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white">New venue</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">GameDay Command Center</p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-[var(--foreground)] sm:text-3xl">{view.venueName}</h1>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{dateLabel} · {timeZoneAbbreviation(view.timeZone)} · updated {generatedLabel}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 sm:max-w-xs">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{mode.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{mode.caption}</p>
          </div>
          {/* Walkthrough helper: re-times the DEMO games onto today so this board
              shows a live Saturday. Platform staff only; demo sessions only. */}
          {isPlatformAdmin(ctx) || canManagePlatform(ctx) ? (
            <form action={refreshDemoDayAction}>
              <button type="submit" className="inline-flex min-h-8 items-center rounded-lg border border-dashed border-[var(--line)] bg-transparent px-3 text-[11px] font-bold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]">
                ↻ Refresh demo day
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <section className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        <SummaryTile label="Scheduled" value={s.gamesScheduled} />
        <SummaryTile label="Live now" value={s.gamesLive} tone={s.gamesLive > 0 ? "text-emerald-600" : undefined} />
        <SummaryTile label="Behind" value={s.gamesBehind} tone={s.gamesBehind > 0 ? "text-amber-700" : undefined} />
        <SummaryTile label="Fields flagged" value={s.fieldsNeedAttention} tone={s.fieldsNeedAttention > 0 ? "text-red-700" : undefined} />
        <SummaryTile label="Weather" value={s.weatherRisk ? s.weatherRisk : "—"} tone={s.weatherRisk === "severe" ? "text-red-700" : s.weatherRisk === "caution" ? "text-amber-700" : "text-emerald-600"} />
        <SummaryTile label="Officials open" value={s.officialsUnconfirmed} tone={s.officialsUnconfirmed > 0 ? "text-amber-700" : undefined} />
        {/*
          Green here must mean "healthy", not "not yet offline". This read a green
          9/9 for a venue whose six manual boards had never reported once, because
          `unknown` was quietly counted as good. Same lie deviceCheck used to tell.
        */}
        <SummaryTile
          label="Systems"
          value={s.systemsTotal === 0 ? "OK" : `${s.systemsTotal - s.systemsOffline - s.systemsUnknown}/${s.systemsTotal}`}
          tone={s.systemsOffline > 0 ? "text-red-700" : s.systemsUnknown > 0 ? "text-amber-700" : "text-emerald-600"}
        />
      </section>

      <SchedulePulseCard pulse={view.pulse} />

      <div className="mt-7">
        <ModeChecklistCard checklist={view.checklist} />
      </div>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Attention Queue</h2>
          <span className="flex flex-wrap items-center gap-3">
            <Link href="/admin/command-center/end-of-day" className="text-xs font-black text-[var(--accent-strong)]">Day report →</Link>
            <Link href="/admin/operations-center" className="text-xs font-black text-[var(--accent-strong)]">Venue status &amp; alerts →</Link>
          </span>
        </div>
        {view.attention.length === 0 ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">All clear — nothing needs attention right now.</p>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            {[["Urgent", urgent], ["Action needed soon", soon], ["Information", info]].map(([heading, items]) => (
              <div key={heading as string} className="grid content-start gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{heading as string} · {(items as AttentionItem[]).length}</p>
                {(items as AttentionItem[]).length === 0 ? (
                  <p className="rounded-lg bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">Nothing here.</p>
                ) : (
                  (items as AttentionItem[]).map((item) => <AttentionCard key={item.id} item={item} />)
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Field Board</h2>
        {view.fields.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-[var(--muted)]">No fields configured at this venue.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {view.fields.map((entry) => <FieldCard key={entry.fieldId} entry={entry} />)}
          </div>
        )}
      </section>

      <section className="mt-8 border-t border-[var(--line)] pt-5">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Jump to</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["Venue status & alerts", "/admin/operations-center"],
            ["Storm assessment", "/admin/alerts/storm"],
            ["Officials", "/admin/sessions/officials"],
            ["Work orders", "/admin/fields/work-orders"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="inline-flex min-h-9 items-center rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-bold text-[var(--foreground)]">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
