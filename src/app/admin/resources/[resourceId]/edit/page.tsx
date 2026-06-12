import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getFields } from "@/lib/services/fields";
import { getResource, resourceStatuses, resourceTypes, updateResource } from "@/lib/services/resources";
import { getVenues } from "@/lib/services/venues";
import { readResourceFormData } from "../../form-utils";

type EditResourcePageProps = {
  params: Promise<{ resourceId: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const { resourceId } = await params;
  const [resource, venues, fields] = await Promise.all([getResource(resourceId), getVenues(), getFields()]);

  async function updateResourceAction(formData: FormData) {
    "use server";

    const parsed = readResourceFormData(formData);
    if ("error" in parsed) {
      return;
    }

    await updateResource(resourceId, parsed.data);
    revalidatePath("/admin/resources");
    revalidatePath("/admin/dashboard");
    revalidatePath("/fields/[fieldId]", "page");
    redirect("/admin/resources");
  }

  if (!resource) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/resources" className="text-sm font-bold text-[var(--accent-strong)]">Back to resources</Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Resource not found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/resources" className="text-sm font-bold text-[var(--accent-strong)]">Back to resources</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Inventory</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit resource</h1>
      </div>
      <form action={updateResourceAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Venue</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.venueId} name="venue_id" required>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Field</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.fieldId ?? ""} name="field_id">
              <option value="">Venue-wide resource</option>
              {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
            </select>
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Resource name</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.resourceName} name="resource_name" required />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Resource type</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.resourceType} name="resource_type" required>
              {resourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Status</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.status} name="status" required>
              {resourceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Manufacturer</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.manufacturer ?? ""} name="manufacturer" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Model</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.model ?? ""} name="model" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Serial number</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={resource.serialNumber ?? ""} name="serial_number" />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Notes</span>
          <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={resource.notes ?? ""} name="notes" />
        </label>
        <div className="flex justify-end border-t border-[var(--line)] pt-5">
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
            Save resource
          </button>
        </div>
      </form>
    </section>
  );
}
