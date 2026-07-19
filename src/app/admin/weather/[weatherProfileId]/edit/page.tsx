import Link from "next/link";
import { notFound } from "next/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getWeatherProfile } from "@/lib/services/weather-profiles";
import { WeatherProfileForm } from "../../weather-profile-form";

type EditWeatherProfilePageProps = {
  params: Promise<{
    weatherProfileId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditWeatherProfilePage({ params }: EditWeatherProfilePageProps) {
  const { weatherProfileId } = await params;
  const [profile, scoped] = await Promise.all([getWeatherProfile(weatherProfileId), getScopedVenuesAndFields()]);
  const venues = scoped.venues;

  // Object-level authorization: only edit weather profiles for an in-scope venue.
  if (!profile || !scoped.venues.some((venue) => venue.id === profile.venueId)) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/weather" className="text-sm font-bold text-[var(--accent-strong)]">Back to weather</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Weather profile</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit weather profile</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Update the manual weather check location, source, status, and notes for game day.
        </p>
      </div>
      <WeatherProfileForm profile={profile} venues={venues} />
    </section>
  );
}
