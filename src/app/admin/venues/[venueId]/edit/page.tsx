import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getVenue, updateVenue } from "@/lib/services/venues";
import { getSessionContext } from "@/lib/access/session";
import { venueInScope } from "@/lib/access/capabilities";
import { VENUE_TIMEZONE_OPTIONS } from "@/lib/venue-timezone";

type EditVenuePageProps = {
  params: Promise<{ venueId: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  const { venueId } = await params;
  const venue = await getVenue(venueId);
  const ctx = await getSessionContext();
  // Venue-scoped roles may only edit their own venue; out-of-scope venues read
  // as "not found" so their existence isn't leaked.
  const inScope = venue ? venueInScope(ctx, venue) : false;

  async function updateVenueAction(formData: FormData) {
    "use server";

    // Defense in depth: re-verify scope on the write, not just the render.
    const actingCtx = await getSessionContext();
    const target = await getVenue(venueId);
    if (!target || !venueInScope(actingCtx, target)) {
      redirect("/admin/venues");
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "").trim();
    const logoUrl = String(formData.get("logo_url") ?? "").trim();
    const bannerUrl = String(formData.get("banner_url") ?? "").trim();
    const mapImageUrl = String(formData.get("map_image_url") ?? "").trim();
    const mapNotes = String(formData.get("map_notes") ?? "").trim();
    const primaryColor = String(formData.get("primary_color") ?? "").trim();
    const secondaryColor = String(formData.get("secondary_color") ?? "").trim();

    if (!name) {
      return;
    }

    await updateVenue(
      venueId,
      {
        name,
        description,
        address,
        // Empty is a no-op in updateVenue, so a form posted without the field
        // leaves the venue's existing zone alone rather than resetting it.
        timezone: timezone || undefined,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
        map_image_url: mapImageUrl || null,
        map_notes: mapNotes || null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
      },
    );
    revalidatePath("/admin/venues");
    redirect("/admin/venues");
  }

  if (!venue || !inScope) {
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

  // A venue can hold any IANA zone (set at onboarding or directly in SQL), while
  // the picker only lists the common US ones. Surface the venue's current zone
  // as its own option when it isn't on that list — otherwise the select would
  // default to the first entry and silently rewrite the zone on the next save.
  const timezoneOptions = VENUE_TIMEZONE_OPTIONS.some((option) => option.value === venue.timezone)
    ? VENUE_TIMEZONE_OPTIONS
    : [...VENUE_TIMEZONE_OPTIONS, { value: venue.timezone, label: venue.timezone }];

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
        <label className="grid gap-2">
          <span className="text-sm font-bold">Timezone</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={venue.timezone} name="timezone" required>
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className="text-sm leading-6 text-[var(--muted)]">
            This venue&rsquo;s own clock. It sets when the operating day rolls over and how every game
            time reads across Today, Fields, Schedule, and reports. Changing it re-dates
            evening games, so only change it if the venue is genuinely in another zone.
          </span>
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
