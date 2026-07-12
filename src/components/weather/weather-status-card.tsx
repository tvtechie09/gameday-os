import Link from "next/link";
import { getLiveWeatherForVenue, LiveWeatherError } from "@/lib/services/weather-live";

function sentenceCase(value: string) {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function WeatherStatusCard({ compact = false, venueId }: { compact?: boolean; venueId: string }) {
  const result = await getWeatherStatusResult(venueId);

  if (!result.ok) {
    // One clear line; repeating "unavailable" three ways reads as broken.
    const detail = result.label.toLowerCase() === "weather unavailable" ? result.message : `${sentenceCase(result.label)}. ${result.message}`;
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-950">Weather</p>
        <p className="mt-2 text-sm font-bold leading-6 text-amber-900">{detail}</p>
      </section>
    );
  }

  const weather = result.weather;

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-900">Weather</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-sky-950">{weather.condition}</h2>
          <p className="mt-1 text-sm font-bold text-sky-900">
            {weather.temperatureF === null ? "Temperature unavailable" : `${weather.temperatureF}°F`}
            {weather.windMph === null ? "" : ` · Wind ${weather.windMph} mph`}
          </p>
        </div>
        <span className="w-fit rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-sky-900">
          {weather.source}
        </span>
      </div>
      {compact ? null : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <WeatherFact label="Rain" value={weather.rainStatus} />
          <WeatherFact label="Lightning" value={weather.lightningStatus} />
          <WeatherFact label="Last checked" value={formatCheckedAt(weather.fetchedAt)} />
        </div>
      )}
      {weather.radarUrl && !compact ? (
        <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-900 px-4 text-sm font-black text-white" href={weather.radarUrl} target="_blank" rel="noreferrer">
          Open radar
        </Link>
      ) : null}
    </section>
  );
}

async function getWeatherStatusResult(venueId: string) {
  try {
    return { ok: true as const, weather: await getLiveWeatherForVenue(venueId) };
  } catch (error) {
    return {
      label: error instanceof LiveWeatherError ? error.code.replaceAll("_", " ") : "weather unavailable",
      message: error instanceof LiveWeatherError ? error.message : "Weather is temporarily unavailable.",
      ok: false as const,
    };
  }
}

function WeatherFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/75 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-900/70">{label}</p>
      <p className="mt-1 text-sm font-black text-sky-950">{value}</p>
    </div>
  );
}
