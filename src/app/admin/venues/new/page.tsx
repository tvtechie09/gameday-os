import { VenueForm } from "./venue-form";
import { redirect } from "next/navigation";
import { canManageVenueSettings, managesAllVenues } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";

export default async function NewVenuePage() {
  const ctx = await getSessionContext();
  if (!canManageVenueSettings(ctx) || !managesAllVenues(ctx)) redirect(getRoleHome(ctx));
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venue setup</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create a venue</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Save a real venue to Supabase. Authentication is not required yet.
        </p>
      </div>

      <VenueForm />
    </section>
  );
}
