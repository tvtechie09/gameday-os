import { permissionAreas, permissionsMatrix } from "@/lib/identity-permissions-matrix";
import { getIdentityRoleAssignments, getIdentityRoles } from "@/lib/services/identity";

export const dynamic = "force-dynamic";

const levelTone = {
  assigned: "bg-blue-50 text-blue-800",
  manage: "bg-green-50 text-green-800",
  none: "bg-slate-100 text-slate-500",
  operate: "bg-amber-50 text-amber-900",
  view: "bg-sky-50 text-sky-800",
};

export default async function IdentityRolesPage() {
  const [roles, assignments] = await Promise.all([
    getIdentityRoles().catch((error: unknown) => {
      console.error("Failed to load identity roles", error);
      return [];
    }),
    getIdentityRoleAssignments().catch((error: unknown) => {
      console.error("Failed to load identity role assignments", error);
      return [];
    }),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Identity Platform</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Roles & Permission Matrix</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
        This page documents expected access. Route-level enforcement is intentionally deferred until authentication and actor resolution are connected.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Metric label="Roles in database" value={roles.length} />
        <Metric label="Matrix roles" value={permissionsMatrix.length} />
        <Metric label="Scoped assignments" value={assignments.length} />
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--background)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Role</th>
                {permissionAreas.map((area) => <th className="px-3 py-3" key={area}>{area}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissionsMatrix.map((row) => (
                <tr className="border-t border-[var(--line)]" key={row.role}>
                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{row.label}</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--muted)]">{row.summary}</p>
                  </td>
                  {permissionAreas.map((area) => (
                    <td className="px-3 py-4 align-top" key={`${row.role}-${area}`}>
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.1em] ${levelTone[row.access[area]]}`}>
                        {row.access[area]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
    </div>
  );
}
