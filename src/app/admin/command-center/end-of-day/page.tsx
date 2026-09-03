import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canViewCommandCenter } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { buildEndOfDay, type EndOfDayReport } from "@/lib/services/end-of-day";
import { PrintDownloadButton } from "@/components/print-download-button";
import { timeZoneAbbreviation } from "@/lib/venue-timezone";

export const dynamic = "force-dynamic";

function formatDate(date: string, timeZone: string) {
  // date is a venue-local YYYY-MM-DD; anchor at noon so the label can't slip a day.
  return new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone }).format(new Date(date + "T12:00:00Z"));
}

function formatGeneratedAt(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone }).format(new Date(iso));
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-3">
      <p className={`text-2xl font-black leading-none tabular-nums ${tone ?? ""}`}>{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function EndOfDayPage({ searchParams }: { searchParams?: Promise<{ date?: string }> }) {
  const ctx = await getSessionContext();
  if (!canViewCommandCenter(ctx)) {
    redirect(getRoleHome(ctx));
  }

  const params = await searchParams;
  // Accept only a YYYY-MM-DD override so a GM can pull yesterday's close.
  const requested = params?.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;
  const report: EndOfDayReport = await buildEndOfDay(ctx, requested);
  const { games, schedule, issues, carryOver } = report;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <Link className="text-sm font-bold text-[var(--accent-strong)]" href="/today">
          ← Today
        </Link>
        <PrintDownloadButton />
      </div>

      <header className="mt-5 border-b-2 border-[var(--foreground)] pb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">End-of-day operations report</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{report.venueName ?? "No venue in scope"}</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
          {formatDate(report.date, report.timeZone)} · generated {formatGeneratedAt(report.generatedAt, report.timeZone)} {timeZoneAbbreviation(report.timeZone)}
        </p>
      </header>

      <Section title="The day">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Scheduled" value={games.scheduled} />
          <Stat label="Completed" value={games.completed} tone="text-emerald-600" />
          <Stat label="Cancelled" value={games.cancelled} />
          <Stat label="Postponed" value={games.postponed} />
          <Stat label="Unfinished" value={games.unfinished} tone={games.unfinished > 0 ? "text-red-700" : undefined} />
        </div>
      </Section>

      <Section title="Schedule performance">
        {schedule.measured === 0 ? (
          <p className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted)]">
            No recorded first-pitch times for this day, so start accuracy can&apos;t be measured. Games started from the
            Today&apos;s game controls record it automatically.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Started on time" value={schedule.startedOnTime} tone="text-emerald-600" />
              <Stat label="Started late" value={schedule.startedLate} tone={schedule.startedLate > 0 ? "text-amber-700" : undefined} />
              <Stat label="Avg start delay" value={`${schedule.averageStartDelayMin}m`} />
              <Stat label="Worst delay" value={`${schedule.worstStartDelayMin}m`} tone={schedule.worstStartDelayMin > 20 ? "text-red-700" : undefined} />
            </div>
            <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
              Measured against actual first pitch for {schedule.measured} game{schedule.measured === 1 ? "" : "s"}
              {schedule.worstStartField ? ` · worst: ${schedule.worstStartField}` : ""}
            </p>
          </>
        )}
      </Section>

      <Section title="Issues">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Opened today" value={issues.openedToday} />
          <Stat label="Resolved today" value={issues.resolvedToday} tone="text-emerald-600" />
          <Stat label="Still open" value={issues.stillOpen} tone={issues.stillOpen > 0 ? "text-amber-700" : undefined} />
          <Stat label="Overdue" value={issues.overdue} tone={issues.overdue > 0 ? "text-red-700" : undefined} />
          <Stat label="Unassigned" value={issues.unowned} tone={issues.unowned > 0 ? "text-amber-700" : undefined} />
        </div>
      </Section>

      <Section title="Carries into tomorrow">
        <div className="grid gap-4">
          {carryOver.openIssues.length > 0 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">Open issues</p>
              <ul className="mt-2 grid gap-1.5">
                {carryOver.openIssues.map((issue) => (
                  <li key={issue.id} className="text-sm font-semibold">
                    <b>{issue.fieldName}</b> — {issue.title}{" "}
                    <span className="text-xs text-[var(--muted)]">
                      ({issue.stage.replace("_", " ")}
                      {issue.assignedRole ? ` · ${issue.assignedRole}` : " · nobody assigned"})
                    </span>
                    {issue.isOverdue ? <span className="ml-1 text-xs font-bold text-red-700">overdue</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {carryOver.unfinishedGames.length > 0 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-red-800">Games without a final</p>
              <ul className="mt-2 grid gap-1.5">
                {carryOver.unfinishedGames.map((game) => (
                  <li key={game.id} className="text-sm font-semibold">
                    <b>{game.fieldName}</b> — {game.label}{" "}
                    <span className="text-xs text-[var(--muted)]">({game.status} · scheduled {game.scheduledStartLabel})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {carryOver.flaggedFields.length > 0 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">Fields still flagged</p>
              <p className="mt-1 text-sm font-semibold">
                {carryOver.flaggedFields.map((field) => `${field.name} (${field.status})`).join(" · ")}
              </p>
            </div>
          ) : null}

          {carryOver.devicesOffline > 0 || carryOver.devicesUnknown > 0 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">Systems</p>
              <p className="mt-1 text-sm font-semibold">
                {carryOver.devicesOffline} offline · {carryOver.devicesUnknown} never reported
              </p>
            </div>
          ) : null}

          {carryOver.openIssues.length === 0 &&
          carryOver.unfinishedGames.length === 0 &&
          carryOver.flaggedFields.length === 0 &&
          carryOver.devicesOffline === 0 &&
          carryOver.devicesUnknown === 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
              Nothing carries over. The venue is clear for tomorrow.
            </p>
          ) : null}
        </div>
      </Section>

      <Section title="Notes">
        <ul className="grid gap-1.5">
          {report.notes.map((note) => (
            <li key={note} className="text-sm leading-6 text-[var(--muted)]">
              {note}
            </li>
          ))}
        </ul>
      </Section>

      <p className="mt-8 border-t border-[var(--line)] pt-4 text-xs font-semibold text-[var(--muted)]">
        Generated by GameDay OS from the game record. Start-time accuracy reflects only games with a recorded first
        pitch; counts are exact.
      </p>
    </section>
  );
}
