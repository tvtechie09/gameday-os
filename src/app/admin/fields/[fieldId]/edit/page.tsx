import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fieldStatuses, getField, getFieldStatusLabel, readFieldStatus, updateField } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";

type EditFieldPageProps = {
  params: Promise<{ fieldId: string }>;
};

export const dynamic = "force-dynamic";

function readOptionalCoordinate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function EditFieldPage({ params }: EditFieldPageProps) {
  const { fieldId } = await params;
  const [field, venues] = await Promise.all([getField(fieldId), getVenues()]);

  async function updateFieldAction(formData: FormData) {
    "use server";

    const venueId = String(formData.get("venue_id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const sportType = String(formData.get("sport_type") ?? "").trim();
    const status = readFieldStatus(String(formData.get("status") ?? field?.status ?? "open"));
    const mapLabel = String(formData.get("map_label") ?? "").trim();

    if (!venueId || !name || !sportType) {
      return;
    }

    await updateField(fieldId, {
      venue_id: venueId,
      name,
      sport_type: sportType,
      status,
      map_label: mapLabel || null,
      map_x: readOptionalCoordinate(formData, "map_x"),
      map_y: readOptionalCoordinate(formData, "map_y"),
    });
    revalidatePath("/admin/fields");
    revalidatePath(`/fields/${fieldId}`);
    redirect("/admin/fields");
  }

  if (!field) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/fields" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to fields
        </Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Field not found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/fields" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to fields
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Fields</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit field</h1>
      </div>

      <form action={updateFieldAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Venue</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={field.venueId} name="venue_id" required>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Field name</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={field.name} name="name" required />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Sport type</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={field.sportType} name="sport_type" required />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Field status</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={field.status} name="status" required>
            {fieldStatuses.map((status) => (
              <option key={status} value={status}>
                {getFieldStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <section className="grid gap-5 border-t border-[var(--line)] pt-5">
          <div>
            <h2 className="text-lg font-black">Map position</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Optional marker placement for the venue map. Use percentages from the left and top edges.
            </p>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Map Label</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={field.mapLabel ?? ""} name="map_label" placeholder="Field 1, Diamond A, Court 3" />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Map X Position</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={field.mapX ?? ""} max="100" min="0" name="map_x" placeholder="0-100" step="0.1" type="number" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Map Y Position</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={field.mapY ?? ""} max="100" min="0" name="map_y" placeholder="0-100" step="0.1" type="number" />
            </label>
          </div>
        </section>
        <div className="flex justify-end border-t border-[var(--line)] pt-5">
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
            Save field
          </button>
        </div>
      </form>
    </section>
  );
}
