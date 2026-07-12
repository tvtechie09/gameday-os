import { NextResponse } from "next/server";
import { createResourceActivationRequest, resourceActivationTypes } from "@/lib/services/resource-activations";
import type { ResourceActivationType } from "@/lib/types";
import { ApiRequestError, parseJsonObject, readBoundedString, readEmail, readHttpUrl } from "@/lib/api-request";

type ActivationPayload = {
  venueId?: unknown;
  fieldId?: unknown;
  sessionId?: unknown;
  activationType?: unknown;
  displayName?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  resourceUrl?: unknown;
  notes?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonObject<ActivationPayload>(request);
    const venueId = readBoundedString(payload.venueId, 128);
    const fieldId = readBoundedString(payload.fieldId, 128);
    const activationType = readBoundedString(payload.activationType, 64);
    const displayName = readBoundedString(payload.displayName, 160);

    if (!venueId || !fieldId || !displayName) {
      return NextResponse.json({ error: "Venue, field, and display name are required." }, { status: 400 });
    }

    if (!resourceActivationTypes.includes(activationType as ResourceActivationType)) {
      return NextResponse.json({ error: "Choose a valid activation type." }, { status: 400 });
    }

    const activation = await createResourceActivationRequest({
      venue_id: venueId,
      field_id: fieldId,
      session_id: readBoundedString(payload.sessionId, 128) || null,
      activation_type: activationType as ResourceActivationType,
      display_name: displayName,
      contact_name: readBoundedString(payload.contactName, 160) || null,
      contact_email: readEmail(payload.contactEmail) || null,
      resource_url: readHttpUrl(payload.resourceUrl) || null,
      notes: readBoundedString(payload.notes, 2000) || null,
    });

    return NextResponse.json({ activation });
  } catch (error) {
    if (error instanceof ApiRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to create resource activation", error);
    return NextResponse.json({ error: "Unable to create community contribution." }, { status: 500 });
  }
}
