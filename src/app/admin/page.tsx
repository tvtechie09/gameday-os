import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccessAdminWorkspace, canManageSchedule, canSendAnnouncement, canViewCommandCenter } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { buildTodayView } from "@/lib/services/venue-operations";
import { Card, PageShell, PageTitle, SectionHeader, buttonStyles } from "@/components/ui/gameday-ui";

export const dynamic = "force-dynamic";

type Destination = {
  description: string;
  href: string;
  label: string;
  question: string;
};

export default async function AdminHomePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canAccessAdminWorkspace(ctx)) redirect(getRoleHome(ctx));

  const view = await buildTodayView(ctx);
  const firstName = (ctx.displayName || ctx.roleLabel).trim().split(/\s+/)[0];
  const fieldAttention = view.fields.filter((field) => ["closed", "delayed", "maintenance"].includes(field.status)).length;
  const attentionCount = fieldAttention + view.alerts.length + view.workOrders.length;
  const destinations: Destination[] = [
    {
      description: "See the day in order: changed, live, next, later, and completed.",
      href: "/today",
      label: "Open Today",
      question: "What is happening now?",
    },
    ...(canViewCommandCenter(ctx) ? [{
      description: "Check current and next games, field state, disruptions, and field issues.",
      href: "/admin/fields",
      label: "Open Fields",
      question: "Where is it happening?",
    }] : []),
    ...(canManageSchedule(ctx) ? [{
      description: "Find, create, edit, or move games using the administrative schedule.",
      href: "/admin/sessions",
      label: "Open Schedule",
      question: "What is planned?",
    }] : []),
  ];

  return (
    <PageShell>
      <PageTitle description="Choose the surface that answers the question you have." eyebrow="Home" title={`Where should ${firstName} go next?`} />

      <section className="mt-6 rounded-2xl bg-[var(--black-soft)] p-5 text-white shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">Today at {view.venueName ?? ctx.venueName ?? "your venue"}</p>
        <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
          {view.events.length} event{view.events.length === 1 ? "" : "s"} today · {view.health.activeGames} live now
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
          {attentionCount > 0 ? `${attentionCount} item${attentionCount === 1 ? " needs" : "s need"} attention.` : "Nothing needs attention right now."}
        </p>
        <Link className={buttonStyles("secondary", "mt-5 bg-white ring-0 hover:bg-white/90")} href="/today">Open Today</Link>
      </section>

      <section className="mt-7">
        <SectionHeader description="One operational question, one obvious destination." title="Run the venue" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {destinations.map((destination) => (
            <Card className="flex h-full flex-col p-5" key={destination.href}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{destination.question}</p>
              <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-[var(--muted)]">{destination.description}</p>
              <Link className={buttonStyles("secondary", "mt-5 w-full")} href={destination.href}>{destination.label}</Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-7 border-t border-[var(--line)] pt-5">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Support the day</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {canViewCommandCenter(ctx) ? <Link className={buttonStyles("quiet")} href="/admin/operations-center">Venue status</Link> : null}
          {canViewCommandCenter(ctx) ? <Link className={buttonStyles("quiet")} href="/admin/fields/work-orders">Work orders</Link> : null}
          {canSendAnnouncement(ctx) ? <Link className={buttonStyles("quiet")} href="/admin/alerts">Announcements</Link> : null}
        </div>
      </section>
    </PageShell>
  );
}
