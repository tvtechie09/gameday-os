import { getOrganizations } from "@/lib/services/organizations";
import { getRoleAssignments, permissionMatrix, roleLabels, roleTypes } from "@/lib/services/roles";
import type { RoleType } from "@/lib/types";
import { redirect } from "next/navigation";
import { canManagePermissions } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function roleBadgeClass(roleType: RoleType) {
  if (roleType === "super_admin") return "bg-[var(--black-soft)] text-white";
  if (roleType === "organization_admin") return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  if (roleType === "field_operator") return "bg-blue-50 text-blue-800 ring-1 ring-blue-200";
  if (roleType === "volunteer") return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export default async function RolesPage() {
  const ctx = await getSessionContext();
  if (!canManagePermissions(ctx)) redirect(getRoleHome(ctx));

  const [assignments, organizations] = await Promise.all([
    getRoleAssignments().catch((error: unknown) => {
      console.error("Failed to load role assignments", error);
      return [];
    }),
    getOrganizations().catch((error: unknown) => {
      console.error("Failed to load role organizations", error);
      return [];
    }),
  ]);
  const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Role Framework</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Roles and permissions</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
          Framework-only role definitions for GameDay OS. Authentication and permission enforcement will be added later.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {roleTypes.map((roleType) => (
          <article className="ui-card p-5" key={roleType}>
            <p className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${roleBadgeClass(roleType)}`}>
              {roleLabels[roleType]}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {roleType === "super_admin" ? "Cross-organization platform operator." : null}
              {roleType === "organization_admin" ? "Owns one organization workspace." : null}
              {roleType === "field_operator" ? "Runs game-day field operations." : null}
              {roleType === "volunteer" ? "Helps with assigned game tasks." : null}
              {roleType === "read_only" ? "Can inspect data without editing." : null}
            </p>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Assigned roles</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Role assignments are informational until authentication is added.</p>
          </div>
          <span className="rounded-md bg-[var(--background)] px-3 py-2 text-sm font-black">{assignments.length} assigned</span>
        </div>

        <div className="mt-5 grid gap-3">
          {assignments.length > 0 ? assignments.map((assignment) => {
            const organization = assignment.organizationId ? organizationsById.get(assignment.organizationId) : null;
            return (
              <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={assignment.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black">{assignment.displayName}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{assignment.email}</p>
                    <p className="mt-2 text-sm font-bold">{organization?.name ?? "All Organizations"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${roleBadgeClass(assignment.roleType)}`}>
                      {roleLabels[assignment.roleType]}
                    </span>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[var(--muted)]">
                      {formatDate(assignment.createdAt)}
                    </span>
                  </div>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-lg bg-[var(--background)] p-5">
              <h3 className="text-lg font-black">No role assignments yet</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Add rows to the `role_assignments` table to document who should hold each future permission level.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-2xl font-black">Permission matrix</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Planned access by role. This matrix is documentation only in v1.</p>

        <div className="mt-5 grid gap-4">
          {permissionMatrix.map((section) => (
            <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={section.area}>
              <div>
                <h3 className="text-xl font-black">{section.area}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {section.pages.map((page) => (
                    <code className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[var(--muted)]" key={page}>{page}</code>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-5">
                {roleTypes.map((roleType) => (
                  <div className="rounded-lg bg-white p-3" key={roleType}>
                    <p className={`w-fit rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${roleBadgeClass(roleType)}`}>
                      {roleLabels[roleType]}
                    </p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">{section.access[roleType]}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
