"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { audioModes, audioProfileStatuses, getAudioModeLabel, getAudioStatusLabel } from "@/lib/services/audio-profiles";
import type { AudioProfile, Field, Session, Venue } from "@/lib/types";
import { createAudioProfileAction, updateAudioProfileAction } from "./actions";

type AudioProfileFormProps = {
  fields: Field[];
  profile?: AudioProfile;
  sessions: Session[];
  venues: Venue[];
};

type Message = {
  kind: "error" | "success";
  text: string;
};

export function AudioProfileForm({ fields, profile, sessions, venues }: AudioProfileFormProps) {
  const router = useRouter();
  const [selectedVenueId, setSelectedVenueId] = useState(profile?.venueId ?? "");
  const [selectedFieldId, setSelectedFieldId] = useState(profile?.fieldId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const venueFields = useMemo(() => fields.filter((field) => field.venueId === selectedVenueId), [fields, selectedVenueId]);
  const fieldSessions = useMemo(() => sessions.filter((session) => session.fieldId === selectedFieldId), [sessions, selectedFieldId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = profile
      ? await updateAudioProfileAction(profile.id, formData)
      : await createAudioProfileAction(formData);

    if (result.error) {
      console.error("Failed to save audio profile", result.error);
      setMessage({ kind: "error", text: result.error });
      setIsSaving(false);
      return;
    }

    setMessage({ kind: "success", text: "Audio profile saved." });
    router.push("/admin/audio");
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
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving} name="venue_id" onChange={(event) => {
            setSelectedVenueId(event.target.value);
            setSelectedFieldId("");
          }} required value={selectedVenueId}>
            <option value="">Select venue</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Field <span className="text-red-600">*</span></span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" disabled={isSaving || !selectedVenueId} name="field_id" onChange={(event) => setSelectedFieldId(event.target.value)} required value={selectedFieldId}>
            <option value="">Select field</option>
            {venueFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Session</span>
        <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.sessionId ?? ""} disabled={isSaving || !selectedFieldId} name="session_id">
          <option value="">Field-level audio profile</option>
          {fieldSessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Audio mode</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.audioMode ?? "none"} disabled={isSaving} name="audio_mode" required>
            {audioModes.map((mode) => <option key={mode} value={mode}>{getAudioModeLabel(mode)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Status</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.status ?? "not_configured"} disabled={isSaving} name="status" required>
            {audioProfileStatuses.map((status) => <option key={status} value={status}>{getAudioStatusLabel(status)}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Speaker type</span>
          <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.speakerType ?? ""} disabled={isSaving} name="speaker_type" placeholder="Venue PA, portable speaker, mixer" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Provider</span>
          <input className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={profile?.provider ?? ""} disabled={isSaving} name="provider" placeholder="Venue, parent volunteer, OBS operator" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Notes</span>
        <textarea className="min-h-32 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={profile?.notes ?? ""} disabled={isSaving} name="notes" />
      </label>

      <div className="flex justify-end border-t border-[var(--line)] pt-5">
        <button className="min-h-12 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : profile ? "Save audio profile" : "Create audio profile"}
        </button>
      </div>
    </form>
  );
}
