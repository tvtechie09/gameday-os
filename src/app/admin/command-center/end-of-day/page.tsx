import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManageVenueSettings } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { buildEndOfDay, type EndOfDayReport } from "@/lib/services/end-of-day";
import { timeZoneAbbreviation } from "@/lib/venue-timezone";

export const dynamic = "force-dynamic";

function formatDate(date: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone }).format(new Date(date + "T12:00:00Z"));
}

function attentionCount(report: EndOfDayReport) {
  return report.carryOver.openIssues.length
    + report.carryOver.flaggedFields.length
    + report.carryOver.unfinishedGames.length
    + report.carryOver.activeAnnouncements.length
    + report.carryOver.devicesOffline
    + report.carryOver.devicesUnknown;
}

function Item({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <li>
      <Link className="block min-h-16 rounded-lg border border-[var(--line)] bg-white p-4 transition hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]" href={href}>
        <span className="block font-black">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">{detail}</span>
      </Link>
    </li>
  );
}

export default async function EndOfDayPage({ searchParams }: { searchParams?: Promise<{ date?: string }> }) {
  const ctx = await getSessionContext();
  if (!canManageVenueSettings(ctx)) redirect(getRoleHome(ctx));

  const params = await searchParams;
  const report = await buildEndOfDay(ctx, params?.date);
  const attention = attentionCount(report);
  const { carryOver } = report;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link className="text-sm font-bold text-[var(--accent-strong)]" href="/today">← Today</Link>

      <header className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">End of Day</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Anything to handle before you leave?</h1>
        <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
          {report.venueName ?? "No venue in scope"} · {formatDate(report.date, report.timeZone)} · {timeZoneAbbreviation(report.timeZone)}
        </p>
      </header>

      <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm font-bold" htmlFor="closeout-date">
          View a recent day
          <input className="mt-1 block min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" defaultValue={report.date} id="closeout-date" name="date" type="date" />
        </label>
        <button className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black" type="submit">View</button>
      </form>

      {attention === 0 ? (
        <section className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-black text-emerald-950">You&apos;re all set for today.</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">No open work, flagged fields, unfinished games, active announcements, or system health gaps need attention.</p>
        </section>
      ) : (
        <section className="mt-7">
          <h2 className="text-xl font-black">Needs attention</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{attention} item{attention === 1 ? "" : "s"} to review on the owning screen.</p>
          <ul className="mt-4 grid gap-3">
            {carryOver.openIssues.map((issue) => (
              <Item href={`/admin/fields/work-orders/${issue.id}`} key={`work-${issue.id}`} title={issue.title} detail={`${issue.fieldName} · ${issue.stage.replace("_", " ")}${issue.isOverdue ? " · overdue" : issue.assignedRole ? ` · ${issue.assignedRole}` : " · nobody assigned"}`} />
            ))}
            {carryOver.flaggedFields.map((field) => (
              <Item href="/admin/fields" key={`field-${field.id}`} title={`${field.name} is ${field.status}`} detail="Review the field on Field Operations before tomorrow." />
            ))}
            {carryOver.unfinishedGames.map((game) => (
              <Item href={`/admin/sessions/${game.id}`} key={`game-${game.id}`} title={`${game.label} needs a final state`} detail={`${game.fieldName} · scheduled ${game.scheduledStartLabel} · ${game.status}`} />
            ))}
            {carryOver.activeAnnouncements.map((announcement) => (
              <Item href={`/admin/alerts/${announcement.id}/edit`} key={`announcement-${announcement.id}`} title={announcement.title} detail={`${announcement.priority} announcement still active for this date.`} />
            ))}
            {carryOver.devicesOffline > 0 ? <Item href="/admin/assets" title={`${carryOver.devicesOffline} system${carryOver.devicesOffline === 1 ? "" : "s"} offline or unhealthy`} detail="Review trusted asset health before leaving." /> : null}
            {carryOver.devicesUnknown > 0 ? <Item href="/admin/assets" title={`${carryOver.devicesUnknown} system${carryOver.devicesUnknown === 1 ? " has" : "s have"} never reported`} detail="Verify on site; unknown is not treated as healthy." /> : null}
          </ul>
        </section>
      )}

      <section className="mt-8 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Today at a glance</h2>
        <ul className="mt-3 grid gap-2 text-sm font-semibold sm:grid-cols-2">
          <li>{report.games.completed} of {report.games.scheduled} games completed</li>
          <li>{report.fields.clear} of {report.fields.total} fields clear</li>
          <li>{report.issues.resolvedToday} Work Order{report.issues.resolvedToday === 1 ? "" : "s"} resolved</li>
          <li>{report.schedule.measured} game start{report.schedule.measured === 1 ? "" : "s"} measured</li>
        </ul>
        {report.notes.length > 0 ? (
          <details className="mt-5 rounded-lg border border-[var(--line)] bg-white p-4">
            <summary className="cursor-pointer font-black">Closeout notes</summary>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)]">
              {report.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </details>
        ) : null}
      </section>

      <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
        This is a read-only checklist. It does not close the venue, change games, dismiss announcements, or hide unresolved work. Dates are limited to the most recent 14 venue-local days.
      </p>
    </section>
  );
}
