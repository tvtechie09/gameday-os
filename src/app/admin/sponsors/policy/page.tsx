import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getScopedOrganizationIds } from "@/lib/access/scoped-venue-data";
import { getOrganizations } from "@/lib/services/organizations";
import { getSponsors } from "@/lib/services/sponsors";
import { getWritableOrganizationId } from "@/lib/organization-scope";
import { isSponsorCategory, SPONSOR_CATEGORIES, sponsorCategoryLabel, type SponsorCategoryKey } from "@/lib/services/sponsor-category-core";
import { getProhibitedCategories, setProhibitedCategories } from "@/lib/services/sponsor-policy";
import { isCategoryProhibited } from "@/lib/services/sponsor-policy-core";

export const dynamic = "force-dynamic";

async function savePolicyAction(formData: FormData) {
  "use server";

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!organizationId) {
    return;
  }

  // Write-side scope check: don't let a venue-scoped admin rewrite another org's
  // advertising policy.
  const scopedOrgIds = await getScopedOrganizationIds();
  if (scopedOrgIds && !scopedOrgIds.has(organizationId)) {
    return;
  }

  const categories = formData
    .getAll("prohibited")
    .map((value) => String(value))
    .filter((value): value is SponsorCategoryKey => isSponsorCategory(value));

  await setProhibitedCategories(organizationId, categories);

  revalidatePath("/admin/sponsors/policy");
  revalidatePath("/admin/sponsors");
  revalidatePath("/admin/sponsors/campaigns");
}

export default async function SponsorPolicyPage() {
  const organizationId = await getWritableOrganizationId();
  const [organizations, policy, allSponsors] = await Promise.all([
    getOrganizations().catch(() => []),
    getProhibitedCategories(organizationId),
    getSponsors().catch(() => []),
  ]);
  const organization = organizations.find((org) => org.id === organizationId) ?? null;

  // Sponsors already on file that the current policy would block. Better to show
  // them here than to let a GM discover it at the moment they try to place one.
  const conflicts = allSponsors.filter((sponsor) => isCategoryProhibited(sponsor.category, policy.categories));
  const uncategorized = allSponsors.filter((sponsor) => !sponsor.category);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsors</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Advertising policy</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Categories your organization does not allow to advertise on its property. Checked categories are blocked when a sponsor
            is placed or a campaign is created. An override is possible, requires a written reason, and is recorded in the audit log.
          </p>
        </div>
        <Link href="/admin/sponsors" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
          Sponsors
        </Link>
      </header>

      {!organizationId ? (
        <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          No organization is in scope, so there is no policy to edit. Choose an organization first.
        </p>
      ) : (
        <>
          {policy.usingDefault ? (
            <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              <strong className="font-black">Using the recommended default.</strong> {organization?.name ?? "This organization"} has not
              set a policy yet, so the standard youth-sports list below is in force. Review it and save to make it yours — including
              saving with nothing checked if your organization allows all categories.
            </p>
          ) : null}

          <form action={savePolicyAction} className="mt-6 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
            <input name="organization_id" type="hidden" value={organizationId} />
            <fieldset className="grid gap-3">
              <legend className="text-sm font-black">Prohibited categories</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SPONSOR_CATEGORIES.map((category) => (
                  <label key={category.key} className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-white px-3 py-2.5">
                    <input
                      className="mt-1 h-4 w-4"
                      defaultChecked={policy.categories.includes(category.key)}
                      name="prohibited"
                      type="checkbox"
                      value={category.key}
                    />
                    <span className="text-sm font-bold">
                      {category.label}
                      {category.restricted ? (
                        <span className="ml-2 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
                          commonly restricted
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end border-t border-[var(--line)] pt-5">
              <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
                Save policy
              </button>
            </div>
          </form>

          <section className="mt-8 grid gap-4">
            <h2 className="text-lg font-black">Sponsors affected by this policy</h2>
            {conflicts.length === 0 ? (
              <p className="rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                No sponsor on file falls in a prohibited category.
              </p>
            ) : (
              <ul className="grid gap-2">
                {conflicts.map((sponsor) => (
                  <li key={sponsor.id} className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                    <span className="text-sm font-bold text-red-900">
                      {sponsor.name} — {sponsorCategoryLabel(sponsor.category)}
                    </span>
                    <Link className="text-sm font-bold text-red-900 underline" href={`/admin/sponsors/${sponsor.id}/edit`}>
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {uncategorized.length > 0 ? (
              <p className="rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                {uncategorized.length} sponsor{uncategorized.length === 1 ? " has" : "s have"} no category yet. Uncategorized sponsors
                are never blocked automatically — set a category so the policy can apply.
              </p>
            ) : null}
          </section>
        </>
      )}
    </section>
  );
}
