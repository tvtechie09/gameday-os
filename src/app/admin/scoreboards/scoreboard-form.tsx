"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getScoreboardConnectionTypeLabel,
  getScoreboardIntegrationModeLabel,
  getScoreboardStatusLabel,
  scoreboardConnectionTypes,
  scoreboardIntegrationModes,
  scoreboardStatuses,
} from "@/lib/services/scoreboards";
import type { Field, Resource, ScoreboardProfile, Venue } from "@/lib/types";
import { createScoreboardProfileAction, updateScoreboardProfileAction } from "./actions";

type Message = {
  kind: "success" | "error";
  text: string;
};

type ScoreboardFormProps = {
  fields: Field[];
  profile?: ScoreboardProfile;
  resources: Resource[];
  venues: Venue[];
};

export function ScoreboardForm({ fields, profile, resources, venues }: ScoreboardFormProps) {
  const router = useRouter();
  const [selectedVenueId, setSelectedVenueId] = useState(profile?.venueId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const venueFields = useMemo(() => fields.filter((field) => field.venueId === selectedVenueId), [fields, selectedVenueId]);
  const scoreboardResources = useMemo(
    () => resources.filter((resource) => resource.resourceType === "scoreboard" && resource.venueId === selectedVenueId),
    [resources, selectedVenueId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = profile
      ? await updateScoreboardProfileAction(profile.id, formData)
      : await createScoreboardProfileAction(formData);

    if (result.error) {
      console.error("Failed to save scoreboard profile", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Scoreboard profile saved." });
    router.push("/admin/scoreboards");
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
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="venue_id" onChange={(event) => setSelectedVenueId(event.target.value)} required value={selectedVenueId}>
            <option value="">Select venue</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Field <span className="text-red-600">*</span></span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.fieldId ?? ""} disabled={isSaving || !selectedVenueId} name="field_id" required>
            <option value="">Select field</option>
            {venueFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Linked scoreboard resource</span>
        <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.resourceId ?? ""} disabled={isSaving || !selectedVenueId} name="resource_id">
          <option value="">No linked resource</option>
          {scoreboardResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.resourceName}</option>)}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Manufacturer</span>
          <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.manufacturer ?? ""} disabled={isSaving} name="manufacturer" placeholder="Manual" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Model</span>
          <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.model ?? ""} disabled={isSaving} name="model" placeholder="GameDay OS" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Connection type</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.connectionType ?? "manual"} disabled={isSaving} name="connection_type" required>
            {scoreboardConnectionTypes.map((type) => <option key={type} value={type}>{getScoreboardConnectionTypeLabel(type)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Integration mode</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.integrationMode ?? "manual_only"} disabled={isSaving} name="integration_mode" required>
            {scoreboardIntegrationModes.map((mode) => <option key={mode} value={mode}>{getScoreboardIntegrationModeLabel(mode)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Sync status</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.scoreboardStatus ?? "not_configured"} disabled={isSaving} name="scoreboard_status" required>
            {scoreboardStatuses.map((status) => <option key={status} value={status}>{getScoreboardStatusLabel(status)}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">IP address</span>
          <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.ipAddress ?? ""} disabled={isSaving} name="ip_address" placeholder="Optional" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Controller location</span>
          <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.controllerLocation ?? ""} disabled={isSaving} name="controller_location" placeholder="Press box, shed, booth" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Notes</span>
        <textarea className="min-h-32 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={profile?.notes ?? ""} disabled={isSaving} name="notes" />
      </label>

      <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <button className="min-h-12 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : profile ? "Save scoreboard profile" : "Create scoreboard profile"}
        </button>
      </div>
    </form>
  );
}
