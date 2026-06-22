import { audioModes, audioProfileStatuses, type CreateAudioProfileInput } from "@/lib/services/audio-profiles";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function readAudioProfileFormData(formData: FormData): { data: CreateAudioProfileInput } | { error: string } {
  const venueId = readString(formData, "venue_id");
  const fieldId = readString(formData, "field_id");
  const audioMode = readString(formData, "audio_mode");
  const status = readString(formData, "status");

  if (!venueId) {
    return { error: "Venue is required." };
  }

  if (!fieldId) {
    return { error: "Field is required." };
  }

  if (!audioModes.includes(audioMode as CreateAudioProfileInput["audio_mode"])) {
    return { error: "Choose a valid audio mode." };
  }

  if (!audioProfileStatuses.includes(status as CreateAudioProfileInput["status"])) {
    return { error: "Choose a valid audio status." };
  }

  return {
    data: {
      venue_id: venueId,
      field_id: fieldId,
      session_id: readString(formData, "session_id") || null,
      audio_mode: audioMode as CreateAudioProfileInput["audio_mode"],
      speaker_type: readString(formData, "speaker_type") || null,
      provider: readString(formData, "provider") || null,
      status: status as CreateAudioProfileInput["status"],
      notes: readString(formData, "notes") || null,
    },
  };
}
