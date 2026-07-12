import Link from "next/link";
import type { ReactNode } from "react";
import { CrossroadsPageShell } from "@/components/crossroads/crossroads-ui";
import { getCrossroadsStaffModeContext, crossroadsStaffRoles, type CrossroadsStaffRole } from "@/lib/demo/crossroads-safety";

export const dynamic = "force-dynamic";

type StaffPageProps = {
  searchParams?: Promise<{
    role?: string;
  }>;
};

function readRole(value: string | undefined): CrossroadsStaffRole {
  return [...crossroadsStaffRoles, "parent", "family_viewer"].includes(value as CrossroadsStaffRole) ? value as CrossroadsStaffRole : "venue_staff";
}

export default async function CrossroadsStaffPage({ searchParams }: StaffPageProps) {
  const params = await searchParams;
  const role = readRole(params?.role);
  const context = getCrossroadsStaffModeContext(role);

  return (
    <CrossroadsPageShell
      actions={<Link className="ui-button ui-button-secondary" href="/demo/crossroads/operations">Send to Operations Center</Link>}
      eyebrow="Staff Mode"
      title="Crossroads Staff Work Center"
    >
      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Role-aware staff view</p>
            <h2 className="mt-2 text-2xl font-black">Viewing as {role.replaceAll("_", " ")}</h2>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
              Staff Mode is for maintenance, concessions, security, venue, and event staff. Parent and family users should not access this operational surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {crossroadsStaffRoles.map((staffRole) => (
              <Link className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.08em] ${staffRole === role ? "bg-[var(--black-soft)] text-white" : "border border-[var(--line)] bg-white"}`} href={`/demo/crossroads/staff?role=${staffRole}`} key={staffRole}>
                {staffRole.replaceAll("_", " ")}
              </Link>
            ))}
            <Link className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.08em] ${role === "parent" ? "bg-red-100 text-red-900" : "border border-[var(--line)] bg-white"}`} href="/demo/crossroads/staff?role=parent">
              parent check
            </Link>
          </div>
        </div>
      </section>

      {!context.allowed ? (
        <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-red-900">Restricted</p>
          <h2 className="mt-2 text-2xl font-black text-red-950">Staff Mode is hidden from parent/family roles</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-red-900">This demo enforces role-aware visibility in the staff experience. Production access will use the GameDay Identity permission model server-side.</p>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Assigned Requests" value={String(context.maintenanceRequests.length)} />
            <Metric label="Open Incidents" value={String(context.openIncidents.length)} />
            <Metric label="Today's Tasks" value={String(context.tasks.length)} />
            <Metric label="Asset Issues" value={String(context.assetIssues.length)} />
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-5">
              <Panel title="Assigned Maintenance Requests">
                {context.maintenanceRequests.map((request) => (
                  <WorkCard key={request.id} eyebrow={request.priority} title={request.title} meta={`${request.locationType} · ${request.status}`} body={request.description} />
                ))}
              </Panel>

              <Panel title="Today's Tasks">
                {context.tasks.map((task) => (
                  <WorkCard key={task.id} eyebrow={task.priority} title={task.title} meta={`${task.locationId} · ${task.status}`} body={task.action} />
                ))}
              </Panel>
            </div>

            <aside className="grid gap-5">
              <Panel title="Open Incidents">
                {context.openIncidents.map((incident) => (
                  <WorkCard key={incident.id} eyebrow={incident.priority} title={incident.title} meta={`${incident.locationId} · ${incident.status}`} body={incident.notes} />
                ))}
              </Panel>

              <Panel title="Quick Actions">
                {["Report Issue", "Mark Resolved", "Upload Photo Placeholder", "Create Safety Incident", "Send to Venue Operations"].map((action) => (
                  <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-left text-sm font-black text-white" key={action} type="button">
                    {action}
                  </button>
                ))}
                <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold text-[var(--muted)]">Photo upload, incident dispatch, and external ticket systems are future integrations in this demo.</p>
              </Panel>

              <Panel title="Location-aware Work Orders">
                {context.assetIssues.map((issue) => (
                  <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-black" key={issue}>{issue}</p>
                ))}
              </Panel>
            </aside>
          </section>
        </>
      )}
    </CrossroadsPageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function WorkCard({ body, eyebrow, meta, title }: { body: string; eyebrow: string; meta: string; title: string }) {
  return (
    <article className="rounded-lg bg-[var(--background)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{eyebrow}</p>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{meta}</p>
      </div>
      <h3 className="mt-2 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{body}</p>
    </article>
  );
}
