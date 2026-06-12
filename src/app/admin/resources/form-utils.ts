import type { ResourceStatus, ResourceType } from "@/lib/types";

const validResourceTypes: ResourceType[] = ["camera", "audio", "scoreboard", "display", "network", "streaming", "other"];
const validResourceStatuses: ResourceStatus[] = ["active", "inactive", "maintenance", "unknown"];

export function readResourceFormData(formData: FormData) {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const fieldId = String(formData.get("field_id") ?? "").trim();
  const resourceName = String(formData.get("resource_name") ?? "").trim();
  const resourceType = String(formData.get("resource_type") ?? "other").trim();
  const status = String(formData.get("status") ?? "unknown").trim();

  if (!venueId || !resourceName) {
    return { error: "Venue and resource name are required." };
  }

  if (!validResourceTypes.includes(resourceType as ResourceType)) {
    return { error: "Choose a valid resource type." };
  }

  if (!validResourceStatuses.includes(status as ResourceStatus)) {
    return { error: "Choose a valid resource status." };
  }

  return {
    data: {
      venue_id: venueId,
      field_id: fieldId || null,
      resource_name: resourceName,
      resource_type: resourceType as ResourceType,
      manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      serial_number: String(formData.get("serial_number") ?? "").trim() || null,
      status: status as ResourceStatus,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  };
}
