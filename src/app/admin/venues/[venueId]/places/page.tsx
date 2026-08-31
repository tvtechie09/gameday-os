import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { venueInScope } from "@/lib/access/capabilities";
import { createFamilyAmenity, getFamilyPlacesAdmin, getFamilyVenueStatusAdmin, setFamilyPlaceVisibility, setFamilyVenueStatus, type FamilyVenuePublicStatus } from "@/lib/services/family-places";
import { getVenue } from "@/lib/services/venues";

const amenityTypes = ["parking", "restroom", "concession", "entrance", "exit", "first_aid", "warmup_area", "information", "locker_room", "equipment", "playground", "batting_cage", "stage", "seating", "room", "other"];
const publicStatuses: FamilyVenuePublicStatus[] = ["open", "closed", "delayed", "weather_hold", "maintenance", "unavailable", "unknown"];

export const dynamic = "force-dynamic";

export default async function FamilyPlacesAdminPage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const [venue, ctx] = await Promise.all([getVenue(venueId), getSessionContext()]);
  if (!venue || !venueInScope(ctx, venue)) redirect("/admin/venues");
  const [rows, venueStatus] = await Promise.all([getFamilyPlacesAdmin(venueId), getFamilyVenueStatusAdmin(venueId)]);

  async function publishVenueStatus(formData: FormData) {
    "use server";
    const actingCtx = await getSessionContext();
    const target = await getVenue(venueId);
    if (!actingCtx || !target || !venueInScope(actingCtx, target)) redirect("/admin/venues");
    const status = String(formData.get("status") || "unknown") as FamilyVenuePublicStatus;
    if (!publicStatuses.includes(status)) return;
    const effectiveAt = optionalDateTime(formData.get("effective_at"));
    const expiresAt = optionalDateTime(formData.get("expires_at"));
    if (effectiveAt && expiresAt && new Date(expiresAt).getTime() <= new Date(effectiveAt).getTime()) return;
    await setFamilyVenueStatus({ venueId, status, message: String(formData.get("message") || ""), effectiveAt, expiresAt }, actingCtx.userId);
    revalidatePath(`/admin/venues/${venueId}/places`);
  }

  async function createAmenity(formData: FormData) {
    "use server";
    const actingCtx = await getSessionContext();
    const target = await getVenue(venueId);
    if (!actingCtx || !target || !venueInScope(actingCtx, target)) redirect("/admin/venues");
    const name = String(formData.get("name") || "").trim();
    const amenityType = String(formData.get("amenity_type") || "other");
    if (!name || !amenityTypes.includes(amenityType)) return;
    await createFamilyAmenity({
      venueId,
      name,
      amenityType,
      description: String(formData.get("description") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      latitude: optionalCoordinate(formData.get("latitude"), -90, 90),
      longitude: optionalCoordinate(formData.get("longitude"), -180, 180),
      accessibilityNotes: String(formData.get("accessibility_notes") || "").trim(),
      operatingHours: String(formData.get("operating_hours") || "").trim(),
      parentVisible: formData.get("parent_visible") === "on",
    }, actingCtx.userId);
    revalidatePath(`/admin/venues/${venueId}/places`);
  }

  async function changeVisibility(formData: FormData) {
    "use server";
    const actingCtx = await getSessionContext();
    const target = await getVenue(venueId);
    if (!actingCtx || !target || !venueInScope(actingCtx, target)) redirect("/admin/venues");
    const sourceType = String(formData.get("source_type"));
    if (!isSourceType(sourceType)) return;
    await setFamilyPlaceVisibility({ venueId, sourceType, sourceId: String(formData.get("source_id")), parentVisible: formData.get("parent_visible") === "true" }, actingCtx.userId);
    revalidatePath(`/admin/venues/${venueId}/places`);
  }

  return <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/admin/venues" className="text-sm font-bold text-[var(--accent-strong)]">Back to venues</Link>
    <div className="mt-5"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Family Places</p><h1 className="mt-2 text-3xl font-black">{venue.name}</h1><p className="mt-3 max-w-2xl text-[var(--muted)]">Publish only the locations families need. Private operations, devices, cameras, audio, and network data never enter the Family projection.</p></div>
    <form action={publishVenueStatus} className="mt-8 grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="text-xl font-black">Family venue status</h2><p className="mt-1 text-sm text-[var(--muted)]">Publish only the status and plain-language guidance families should see. Device and staff diagnostics stay private.</p></div><label className="grid gap-2"><span className="text-sm font-bold">Status</span><select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" defaultValue={venueStatus?.status || "open"} name="status">{publicStatuses.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label className="grid gap-2"><span className="text-sm font-bold">Family message</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" defaultValue={venueStatus?.message || ""} name="message" placeholder="All scheduled games are on time." /></label><label className="grid gap-2"><span className="text-sm font-bold">Effective at (optional)</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" defaultValue={dateTimeLocal(venueStatus?.effectiveAt)} name="effective_at" type="datetime-local" /></label><label className="grid gap-2"><span className="text-sm font-bold">Expires at (optional)</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" defaultValue={dateTimeLocal(venueStatus?.expiresAt)} name="expires_at" type="datetime-local" /></label><button className="min-h-11 rounded-lg bg-[var(--accent)] px-4 font-bold text-white sm:col-span-2" type="submit">Publish family status</button></form>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.7fr)]">
      <section className="rounded-lg border border-[var(--line)] bg-white p-5"><h2 className="text-xl font-black">Published locations</h2><div className="mt-4 grid gap-3">{rows.map((row) => <article className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] p-3" key={`${row.sourceType}:${row.id}`}><div><strong className="block">{row.name}</strong><span className="text-xs uppercase text-[var(--muted)]">{row.sourceType.replaceAll("_", " ")} · {row.type.replaceAll("_", " ")} · {row.status}</span></div><form action={changeVisibility}><input type="hidden" name="source_id" value={row.id} /><input type="hidden" name="source_type" value={row.sourceType} /><input type="hidden" name="parent_visible" value={String(!row.parentVisible)} /><button className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-bold" type="submit">{row.parentVisible ? "Hide" : "Publish"}</button></form></article>)}{rows.length ? null : <p className="text-sm text-[var(--muted)]">No canonical fields or places are configured yet.</p>}</div></section>
      <form action={createAmenity} className="grid content-start gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5"><div><h2 className="text-xl font-black">Add a venue POI</h2><p className="mt-1 text-sm text-[var(--muted)]">Parking, restrooms, concessions, entrances, and other parent-facing essentials.</p></div><label className="grid gap-2"><span className="text-sm font-bold">Name</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="name" required /></label><label className="grid gap-2"><span className="text-sm font-bold">Type</span><select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="amenity_type">{amenityTypes.map((type) => <option value={type} key={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label className="grid gap-2"><span className="text-sm font-bold">Description</span><textarea className="min-h-20 rounded-lg border border-[var(--line)] bg-white p-3" name="description" /></label><label className="grid gap-2"><span className="text-sm font-bold">Exact address, if different</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="address" /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-2"><span className="text-sm font-bold">Latitude</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="latitude" inputMode="decimal" /></label><label className="grid gap-2"><span className="text-sm font-bold">Longitude</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="longitude" inputMode="decimal" /></label></div><label className="grid gap-2"><span className="text-sm font-bold">Hours</span><input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="operating_hours" /></label><label className="grid gap-2"><span className="text-sm font-bold">Accessibility notes</span><textarea className="min-h-20 rounded-lg border border-[var(--line)] bg-white p-3" name="accessibility_notes" /></label><label className="flex min-h-11 items-center gap-3"><input defaultChecked name="parent_visible" type="checkbox" /><span className="text-sm font-bold">Publish to families</span></label><button className="min-h-11 rounded-lg bg-[var(--accent)] px-4 font-bold text-white" type="submit">Add place</button></form>
    </div>
  </section>;
}

function optionalCoordinate(value: FormDataEntryValue | null, minimum: number, maximum: number) { const number = Number(String(value || "")); return String(value || "").trim() && Number.isFinite(number) && number >= minimum && number <= maximum ? number : null; }
function isSourceType(value: string): value is "field" | "zone" | "play_surface" | "amenity" { return ["field", "zone", "play_surface", "amenity"].includes(value); }
function optionalDateTime(value: FormDataEntryValue | null) { const raw = String(value || "").trim(); if (!raw) return null; const parsed = new Date(raw); return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null; }
function dateTimeLocal(value?: string | null) { if (!value) return ""; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 16) : ""; }
