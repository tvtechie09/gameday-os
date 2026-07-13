"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getWeatherSourceLabel, getWeatherStatusLabel, weatherProfileStatuses, weatherSources } from "@/lib/services/weather-profiles";
import type { Venue, WeatherProfile } from "@/lib/types";
import { createWeatherProfileAction, geocodeAddressAction, updateWeatherProfileAction } from "./actions";

type WeatherProfileFormProps = {
  profile?: WeatherProfile;
  venues: Venue[];
};

type Message = {
  kind: "error" | "success";
  text: string;
};

export function WeatherProfileForm({ profile, venues }: WeatherProfileFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [venueId, setVenueId] = useState(profile?.venueId ?? "");
  const [latitude, setLatitude] = useState(profile?.latitude != null ? String(profile.latitude) : "");
  const [longitude, setLongitude] = useState(profile?.longitude != null ? String(profile.longitude) : "");
  const [isGeocoding, setIsGeocoding] = useState(false);

  function buildVenueAddress(): string {
    const venue = venues.find((item) => item.id === venueId);
    if (!venue) return "";
    return [venue.address, venue.city, venue.state].map((part) => (part ?? "").trim()).filter(Boolean).join(", ");
  }

  async function handleLookup() {
    if (isGeocoding) return;
    const address = buildVenueAddress();
    if (!venueId) {
      setMessage({ kind: "error", text: "Select a venue first, then look up its coordinates." });
      return;
    }
    if (!address) {
      setMessage({ kind: "error", text: "The selected venue has no address on file. Add one or enter coordinates manually." });
      return;
    }
    setIsGeocoding(true);
    setMessage(null);
    const result = await geocodeAddressAction(address);
    setIsGeocoding(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setLatitude(String(result.latitude));
    setLongitude(String(result.longitude));
    setMessage({ kind: "success", text: `Coordinates set from ${result.label || address}.` });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = profile
      ? await updateWeatherProfileAction(profile.id, formData)
      : await createWeatherProfileAction(formData);

    if (result.error) {
      console.error("Failed to save weather profile", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Weather profile saved." });
    router.push("/admin/weather");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
      {message ? (
        <div className={message.kind === "success" ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800" : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Venue <span className="text-red-600">*</span></span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" value={venueId} onChange={(event) => setVenueId(event.target.value)} disabled={isSaving} name="venue_id" required>
            <option value="">Select venue</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Location name <span className="text-red-600">*</span></span>
          <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.locationName ?? ""} disabled={isSaving} name="location_name" placeholder="Main complex, city, or nearest weather station" required />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Weather source</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.weatherSource ?? "manual"} disabled={isSaving} name="weather_source" required>
            {weatherSources.map((source) => <option key={source} value={source}>{getWeatherSourceLabel(source)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Status</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.status ?? "not_configured"} disabled={isSaving} name="status" required>
            {weatherProfileStatuses.map((status) => <option key={status} value={status}>{getWeatherStatusLabel(status)}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-bold">Coordinates</span>
          <button className="min-h-10 rounded-lg border border-[var(--accent)] px-3 py-2 text-sm font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving || isGeocoding} onClick={handleLookup} type="button">
            {isGeocoding ? "Looking up..." : "Look up from venue address"}
          </button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Latitude</span>
            <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" value={latitude} onChange={(event) => setLatitude(event.target.value)} disabled={isSaving} name="latitude" placeholder="Optional" step="any" type="number" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Longitude</span>
            <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" value={longitude} onChange={(event) => setLongitude(event.target.value)} disabled={isSaving} name="longitude" placeholder="Optional" step="any" type="number" />
          </label>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Notes</span>
        <textarea className="min-h-32 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={profile?.notes ?? ""} disabled={isSaving} name="notes" placeholder="Manual weather process, who checks radar, lightning policy, or venue-specific weather notes." />
      </label>

      <div className="flex justify-end border-t border-[var(--line)] pt-5">
        <button className="min-h-12 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : profile ? "Save weather profile" : "Create weather profile"}
        </button>
      </div>
    </form>
  );
}
