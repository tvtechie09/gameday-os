import {
  scoreboardConnectionTypes,
  scoreboardIntegrationModes,
  scoreboardStatuses,
  type CreateScoreboardProfileInput,
} from "@/lib/services/scoreboards";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function readScoreboardProfileFormData(formData: FormData): { data: CreateScoreboardProfileInput } | { error: string } {
  const venueId = readString(formData, "venue_id");
  const fieldId = readString(formData, "field_id");
  const connectionType = readString(formData, "connection_type");
  const integrationMode = readString(formData, "integration_mode");
  const scoreboardStatus = readString(formData, "scoreboard_status");

  if (!venueId) {
    return { error: "Venue is required." };
  }

  if (!fieldId) {
    return { error: "Field is required." };
  }

  if (!scoreboardConnectionTypes.includes(connectionType as CreateScoreboardProfileInput["connection_type"])) {
    return { error: "Choose a valid connection type." };
  }

  if (!scoreboardIntegrationModes.includes(integrationMode as CreateScoreboardProfileInput["integration_mode"])) {
    return { error: "Choose a valid integration mode." };
  }

  if (!scoreboardStatuses.includes(scoreboardStatus as CreateScoreboardProfileInput["scoreboard_status"])) {
    return { error: "Choose a valid scoreboard status." };
  }

  return {
    data: {
      venue_id: venueId,
      field_id: fieldId,
      resource_id: readString(formData, "resource_id") || null,
      manufacturer: readString(formData, "manufacturer") || null,
      model: readString(formData, "model") || null,
      connection_type: connectionType as CreateScoreboardProfileInput["connection_type"],
      integration_mode: integrationMode as CreateScoreboardProfileInput["integration_mode"],
      scoreboard_status: scoreboardStatus as CreateScoreboardProfileInput["scoreboard_status"],
      ip_address: readString(formData, "ip_address") || null,
      controller_location: readString(formData, "controller_location") || null,
      notes: readString(formData, "notes") || null,
    },
  };
}
