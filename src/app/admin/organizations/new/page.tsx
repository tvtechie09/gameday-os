import Link from "next/link";
import { redirect } from "next/navigation";
import { createOrganization } from "@/lib/services/organizations";

export const dynamic = "force-dynamic";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createOrganizationAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const logoUrl = String(formData.get("logo_url") ?? "").trim();

  if (!name || !slug) {
    throw new Error("Organization name and slug are required.");
  }

  await createOrganization({
    banner_url: String(formData.get("banner_url") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    logo_url: logoUrl || null,
    name,
    primary_color: String(formData.get("primary_color") ?? "").trim() || null,
    secondary_color: String(formData.get("secondary_color") ?? "").trim() || null,
    slug,
    website_url: String(formData.get("website_url") ?? "").trim() || null,
  });

  redirect("/admin/organizations");
}

export default function NewOrganizationPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Organizations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">New organization</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Create a tenant shell for venues, fields, sessions, sponsors, resources, alerts, and integrations.
          </p>
        </div>
        <Link href="/admin/organizations" className="ui-button ui-button-secondary">
          Cancel
        </Link>
      </div>

      <form action={createOrganizationAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-white p-5">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Organization name <span className="text-red-700">*</span></span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)]"
            name="name"
            placeholder="Example Sports Association"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Slug <span className="text-red-700">*</span></span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)]"
            name="slug"
            pattern="[a-zA-Z0-9-]+"
            placeholder="example-sports"
            required
          />
          <span className="text-xs font-semibold text-[var(--muted)]">Use letters, numbers, and hyphens. The slug will be normalized before saving.</span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Logo URL</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)]"
            name="logo_url"
            placeholder="https://example.com/logo.png"
            type="url"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Description</span>
          <textarea
            className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-base outline-none transition focus:border-[var(--accent)]"
            name="description"
            placeholder="Brief organization description"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Banner URL</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)]"
            name="banner_url"
            placeholder="https://example.com/banner.jpg"
            type="url"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Primary Color</span>
            <input
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)]"
              name="primary_color"
              placeholder="#166534"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Secondary Color</span>
            <input
              className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)]"
              name="secondary_color"
              placeholder="#111827"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Website URL</span>
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base outline-none transition focus:border-[var(--accent)]"
            name="website_url"
            placeholder="https://example.com"
            type="url"
          />
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link href="/admin/organizations" className="ui-button ui-button-secondary">
            Cancel
          </Link>
          <button className="ui-button ui-button-primary" type="submit">
            Create Organization
          </button>
        </div>
      </form>
    </section>
  );
}
