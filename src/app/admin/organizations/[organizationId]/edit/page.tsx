import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/access/capabilities";
import { getSessionContext } from "@/lib/access/session";
import { assertOrganizationInScope, getScopedOrganizationIds } from "@/lib/access/scoped-venue-data";
import { getOrganization, updateOrganization } from "@/lib/services/organizations";

export const dynamic = "force-dynamic";

type EditOrganizationPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function updateOrganizationAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));

  if (!id || !name || !slug) {
    throw new Error("Organization name and slug are required.");
  }

  // Write-side guard: was completely missing before -- any authenticated
  // session could edit any organization's branding by URL, regardless of
  // scope. Throws OrganizationScopeError if the caller can't reach this org.
  await assertOrganizationInScope(id);

  await updateOrganization(id, {
    banner_url: String(formData.get("banner_url") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    name,
    primary_color: String(formData.get("primary_color") ?? "").trim() || null,
    secondary_color: String(formData.get("secondary_color") ?? "").trim() || null,
    slug,
    website_url: String(formData.get("website_url") ?? "").trim() || null,
  });

  const actingCtx = await getSessionContext();
  redirect(isPlatformAdmin(actingCtx) ? "/admin/organizations" : "/org/settings");
}

export default async function EditOrganizationPage({ params }: EditOrganizationPageProps) {
  const { organizationId } = await params;
  const organization = await getOrganization(organizationId);
  const scopedOrgIds = await getScopedOrganizationIds();

  // Read-side guard, same object-level-authorization shape used everywhere
  // else in this app: a scoped caller who can't reach this org gets 404, not
  // a view of another organization's branding form.
  if (!organization || (scopedOrgIds && !scopedOrgIds.has(organization.id))) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Organization Branding</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit {organization.name}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Set the identity used across dashboards, public venue pages, and public field pages.
          </p>
        </div>
        <Link href="/admin/organizations" className="ui-button ui-button-secondary">
          Cancel
        </Link>
      </div>

      <form action={updateOrganizationAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-white p-5">
        <input name="id" type="hidden" value={organization.id} />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Organization name <span className="text-red-700">*</span></span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-base" defaultValue={organization.name} name="name" required />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Slug <span className="text-red-700">*</span></span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-base" defaultValue={organization.slug} name="slug" pattern="[a-zA-Z0-9-]+" required />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Description</span>
          <textarea className="min-h-28 rounded-lg border border-[var(--line)] px-3 py-2 text-base" defaultValue={organization.description} name="description" />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Logo URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-base" defaultValue={organization.logoUrl ?? ""} name="logo_url" type="url" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Banner URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-base" defaultValue={organization.bannerUrl ?? ""} name="banner_url" type="url" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Primary Color</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-base" defaultValue={organization.primaryColor ?? ""} name="primary_color" placeholder="#166534" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Secondary Color</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-base" defaultValue={organization.secondaryColor ?? ""} name="secondary_color" placeholder="#111827" />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Website URL</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-base" defaultValue={organization.websiteUrl ?? ""} name="website_url" type="url" />
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link href="/admin/organizations" className="ui-button ui-button-secondary">Cancel</Link>
          <button className="ui-button ui-button-primary" type="submit">Save Branding</button>
        </div>
      </form>
    </section>
  );
}
