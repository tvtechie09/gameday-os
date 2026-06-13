import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganizations } from "@/lib/services/organizations";

export const dynamic = "force-dynamic";

type TenantRecord = {
  organization_id: string | null;
};

function countByOrganization(rows: TenantRecord[]) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    if (!row.organization_id) return counts;
    counts[row.organization_id] = (counts[row.organization_id] ?? 0) + 1;
    return counts;
  }, {});
}

async function safeTenantRows(tableName: "alerts" | "external_sources" | "fields" | "resources" | "sessions" | "sponsors" | "tournaments" | "venues") {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from(tableName).select("organization_id");
    if (error) throw new Error(error.message);
    return (data ?? []) as TenantRecord[];
  } catch (error) {
    console.error(`Failed to load ${tableName} organization counts`, error);
    return [];
  }
}

export default async function OrganizationsDashboardPage() {
  const [organizations, venues, fields, sessions, sponsors, resources, alerts, integrations] = await Promise.all([
    getOrganizations().catch((error: unknown) => {
      console.error("Failed to load organizations dashboard", error);
      return [];
    }),
    safeTenantRows("venues"),
    safeTenantRows("fields"),
    safeTenantRows("sessions"),
    safeTenantRows("sponsors"),
    safeTenantRows("resources"),
    safeTenantRows("alerts"),
    safeTenantRows("external_sources"),
  ]);

  const venueCounts = countByOrganization(venues);
  const fieldCounts = countByOrganization(fields);
  const sessionCounts = countByOrganization(sessions);
  const sponsorCounts = countByOrganization(sponsors);
  const resourceCounts = countByOrganization(resources);
  const alertCounts = countByOrganization(alerts);
  const integrationCounts = countByOrganization(integrations);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Organizations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Organization dashboard</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Super Admin overview for multi-tenant GameDay OS data. Authentication and role-based access will plug into this organization layer later.
          </p>
        </div>
        <Link href="/admin/dashboard" className="ui-button ui-button-secondary">
          Operations Dashboard
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Organizations" value={organizations.length} />
        <SummaryCard label="Venues" value={venues.length} />
        <SummaryCard label="Fields" value={fields.length} />
        <SummaryCard label="Sessions" value={sessions.length} />
      </div>

      <div className="mt-8 grid gap-4">
        {organizations.length > 0 ? organizations.map((organization) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={organization.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{organization.slug}</p>
                <h2 className="mt-2 text-2xl font-black">{organization.name}</h2>
              </div>
              <span className="rounded-md bg-[var(--accent-soft)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                Tenant Active
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              <MiniStat label="Venues" value={venueCounts[organization.id] ?? 0} />
              <MiniStat label="Fields" value={fieldCounts[organization.id] ?? 0} />
              <MiniStat label="Sessions" value={sessionCounts[organization.id] ?? 0} />
              <MiniStat label="Sponsors" value={sponsorCounts[organization.id] ?? 0} />
              <MiniStat label="Resources" value={resourceCounts[organization.id] ?? 0} />
              <MiniStat label="Alerts" value={alertCounts[organization.id] ?? 0} />
              <MiniStat label="Integrations" value={integrationCounts[organization.id] ?? 0} />
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-black">No organizations found</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Run the Multi-Tenant Organizations migration to create the default organization and attach existing data.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="ui-card p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-4xl font-black leading-none tabular-nums">{value}</p>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}
