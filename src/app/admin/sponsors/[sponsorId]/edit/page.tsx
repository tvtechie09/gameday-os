import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSponsor, updateSponsor } from "@/lib/services/sponsors";
import { assertOrganizationInScope, getScopedOrganizationIds } from "@/lib/access/scoped-venue-data";
import { SponsorCategorySelect } from "@/components/admin/sponsor-category-select";

type EditSponsorPageProps = {
  params: Promise<{ sponsorId: string }>;
};

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

export const dynamic = "force-dynamic";

export default async function EditSponsorPage({ params }: EditSponsorPageProps) {
  const { sponsorId } = await params;
  const sponsor = await getSponsor(sponsorId);
  const scopedOrgIds = await getScopedOrganizationIds();

  async function updateSponsorAction(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return;
    }

    // Re-check on the write path (not just the rendered guard above): reject an
    // update to a sponsor outside the caller's org.
    const current = await getSponsor(sponsorId);
    if (!current) {
      return;
    }
    await assertOrganizationInScope(current.organizationId);

    await updateSponsor(sponsorId, {
      name,
      logo_url: readOptionalText(formData, "logo_url"),
      website_url: readOptionalText(formData, "website_url"),
      description: readOptionalText(formData, "description"),
      category: readOptionalText(formData, "category"),
    });

    revalidatePath("/admin/sponsors");
    revalidatePath("/fields/[fieldId]", "page");
    redirect("/admin/sponsors");
  }

  // Object-level authorization: only edit sponsors within the caller's org.
  if (!sponsor || (scopedOrgIds && sponsor.organizationId && !scopedOrgIds.has(sponsor.organizationId))) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/sponsors" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to sponsors
        </Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Sponsor not found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/sponsors" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to sponsors
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsors</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit sponsor</h1>
      </div>

      <form action={updateSponsorAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Sponsor name</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={sponsor.name} name="name" required />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Logo URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={sponsor.logoUrl ?? ""} name="logo_url" type="url" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Website URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={sponsor.websiteUrl ?? ""} name="website_url" type="url" />
          </label>
        </div>
        <SponsorCategorySelect defaultValue={sponsor.category} />
        <label className="grid gap-2">
          <span className="text-sm font-bold">Description</span>
          <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={sponsor.description} name="description" />
        </label>
        <div className="flex justify-end border-t border-[var(--line)] pt-5">
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
            Save sponsor
          </button>
        </div>
      </form>
    </section>
  );
}
