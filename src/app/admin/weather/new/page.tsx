import Link from "next/link";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { WeatherProfileForm } from "../weather-profile-form";

export const dynamic = "force-dynamic";

export default async function NewWeatherProfilePage() {
  const { venues } = await getScopedVenuesAndFields();

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/weather" className="text-sm font-bold text-[var(--accent-strong)]">Back to weather</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Weather profile</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create weather profile</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Add a manual weather monitoring profile for a venue. Real weather APIs and lightning detection can be connected later.
        </p>
      </div>
      <WeatherProfileForm venues={venues} />
    </section>
  );
}
