import Link from "next/link";
import { allOrganizationsScope, getCurrentOrganizationScope } from "@/lib/organization-scope";
import { getOrganizations } from "@/lib/services/organizations";

export const dynamic = "force-dynamic";

export default async function OrganizationBrandingPage() {
  const [selectedOrganizationId, organizations] = await Promise.all([
    getCurrentOrganizationScope(),
    getOrganizations().catch((error: unknown) => {
      console.error("Failed to load organizations for branding page", error);
      return [];
    }),
  ]);

  const selectedOrganization = selectedOrganizationId
    ? organizations.find((organization) => organization.id === selectedOrganizationId) ?? null
    : null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Branding</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Organization branding</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Manage the logo, banner, colors, website, and description used for the selected organization.
          </p>
        </div>
        {selectedOrganization ? (
          <Link href={`/admin/organizations/${selectedOrganization.id}/edit`} className="ui-button ui-button-primary">
            Edit Current Organization
          </Link>
        ) : null}
      </div>

      {selectedOrganization ? (
        <article className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Current organization</p>
          <h2 className="mt-2 text-2xl font-black">{selectedOrganization.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{selectedOrganization.description || "No description added."}</p>
          <Link href={`/admin/organizations/${selectedOrganization.id}/edit`} className="ui-button ui-button-primary mt-5">
            Edit Branding
          </Link>
        </article>
      ) : (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-amber-950">Select a specific organization</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            The switcher is currently set to {allOrganizationsScope === "all" ? "All Organizations" : "all"}. Choose an organization in the sidebar, or edit one below.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {organizations.map((organization) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={organization.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{organization.slug}</p>
                <h3 className="mt-1 text-xl font-black">{organization.name}</h3>
              </div>
              <Link href={`/admin/organizations/${organization.id}/edit`} className="ui-button ui-button-secondary">
                Edit Organization
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
