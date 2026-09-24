"use server";

import { headers } from "next/headers";
import { createVenueServiceRequest } from "@/lib/services/venue-service-requests";
import {
  isMaintenanceSeverity,
  isVenueServiceRequestType,
} from "@/lib/services/venue-service-request-core";
import { publicErrorMessage } from "@/lib/public-error";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export type PublicServiceRequestState = {
  ok: boolean;
  error?: string;
  requestReference?: string;
};

export async function createPublicServiceRequestAction(
  _previous: PublicServiceRequestState,
  formData: FormData,
): Promise<PublicServiceRequestState> {
  try {
    const fieldId = String(formData.get("field_id") ?? "").trim();
    const sessionId = String(formData.get("session_id") ?? "").trim() || null;
    const requestTypeValue = String(formData.get("request_type") ?? "").trim();
    const severityValue = String(formData.get("severity") ?? "").trim();

    if (!fieldId || !isVenueServiceRequestType(requestTypeValue)) {
      return { ok: false, error: "Choose a valid request type from the field page." };
    }
    const requestHeaders = await headers();
    const limit = rateLimit(`venue-service-request:${clientIpFromHeaders(requestHeaders)}:${fieldId}`, 6, 10 * 60_000);
    if (!limit.ok) {
      return { ok: false, error: `Too many requests were sent from this device. Try again in ${limit.retryAfter} seconds or tell venue staff directly.` };
    }
    if (requestTypeValue !== "TRAINER_ASSISTANCE" && requestTypeValue !== "MAINTENANCE_FIELD_ISSUE") {
      return { ok: false, error: "That request type is not available yet." };
    }
    if (requestTypeValue === "MAINTENANCE_FIELD_ISSUE" && !isMaintenanceSeverity(severityValue)) {
      return { ok: false, error: "Choose how the field issue affects operations." };
    }

    const request = await createVenueServiceRequest({
      fieldId,
      sessionId,
      requestType: requestTypeValue,
      severity: requestTypeValue === "MAINTENANCE_FIELD_ISSUE" && isMaintenanceSeverity(severityValue) ? severityValue : null,
      requesterName: String(formData.get("requester_name") ?? "") || null,
      note: requestTypeValue === "MAINTENANCE_FIELD_ISSUE" ? String(formData.get("note") ?? "") || null : null,
      source: "FIELD_PAGE",
    });

    return { ok: true, requestReference: request.id.slice(0, 8).toUpperCase() };
  } catch (error) {
    return { ok: false, error: publicErrorMessage(error, "Unable to send the request. Please tell venue staff directly.") };
  }
}
