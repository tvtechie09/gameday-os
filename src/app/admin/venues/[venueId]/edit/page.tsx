import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getVenue, updateVenue } from "@/lib/services/venues";

type EditVenuePageProps = {
  params: Promise<{ venueId: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  const { venueId } = await params;
  const venue = await getVenue(venueId);

  async function updateVenueAction(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const logoUrl = String(formData.get("logo_url") ?? "").trim();
    const bannerUrl = String(formData.get("banner_url") ?? "").trim();
    const mapImageUrl = String(formData.get("map_image_url") ?? "").trim();
    const mapNotes = String(formData.get("map_notes") ?? "").trim();
    const primaryColor = String(formData.get("primary_color") ?? "").trim();
    const secondaryColor = String(formData.get("secondary_color") ?? "").trim();

    if (!name) {
      return;
    }

    await updateVenue(venueId, {
      name,
      description,
      address,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      map_image_url: mapImageUrl || null,
      map_notes: mapNotes || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
    });
    revalidatePath("/admin/venues");
    redirect("/admin/venues");
  }

  if (!venue) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/venues" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to venues
        </Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Venue not found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/venues" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to venues
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venues</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit venue</h1>
      </div>

      <form action={updateVenueAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Venue name</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={venue.name} name="name" required />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Description</span>
          <textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={venue.description} name="description" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Address</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={venue.address} name="address" />
        </label>
        <section className="grid gap-5 border-t border-[var(--line)] pt-5">
          <div>
            <h2 className="text-lg font-black">Venue branding</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Optional logo, banner, and colors for QR landing pages.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Logo URL</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={venue.logoUrl ?? ""} name="logo_url" placeholder="https://" type="url" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Banner URL</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={venue.bannerUrl ?? ""} name="banner_url" placeholder="https://" type="url" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Primary color</span>
              <input className="h-11 rounded-lg border border-[var(--line)] bg-white px-2" defaultValue={venue.primaryColor ?? "#166534"} name="primary_color" type="color" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Secondary color</span>
              <input className="h-11 rounded-lg border border-[var(--line)] bg-white px-2" defaultValue={venue.secondaryColor ?? "#111827"} name="secondary_color" type="color" />
            </label>
          </div>
        </section>
        <section className="grid gap-5 border-t border-[var(--line)] pt-5">
          <div>
            <h2 className="text-lg font-black">Venue map</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Optional field map shown to parents on public field pages.
            </p>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Map Image URL</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={venue.mapImageUrl ?? ""} name="map_image_url" placeholder="https://" type="url" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Map Notes</span>
            <textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={venue.mapNotes ?? ""} name="map_notes" />
          </label>
        </section>
        <div className="flex justify-end border-t border-[var(--line)] pt-5">
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
            Save venue
          </button>
        </div>
      </form>
    </section>
  );
}
