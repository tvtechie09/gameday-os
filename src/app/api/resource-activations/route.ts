import { NextResponse } from "next/server";
import { createResourceActivationRequest, resourceActivationTypes } from "@/lib/services/resource-activations";
import type { ResourceActivationType } from "@/lib/types";

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
    const payload = await request.json() as ActivationPayload;
    const venueId = readString(payload.venueId);
    const fieldId = readString(payload.fieldId);
    const activationType = readString(payload.activationType);
    const displayName = readString(payload.displayName);

    if (!venueId || !fieldId || !displayName) {
      return NextResponse.json({ error: "Venue, field, and display name are required." }, { status: 400 });
    }

    if (!resourceActivationTypes.includes(activationType as ResourceActivationType)) {
      return NextResponse.json({ error: "Choose a valid activation type." }, { status: 400 });
    }

    const activation = await createResourceActivationRequest({
      venue_id: venueId,
      field_id: fieldId,
      session_id: readString(payload.sessionId) || null,
      activation_type: activationType as ResourceActivationType,
      display_name: displayName,
      contact_name: readString(payload.contactName) || null,
      contact_email: readString(payload.contactEmail) || null,
      resource_url: readString(payload.resourceUrl) || null,
      notes: readString(payload.notes) || null,
    });

    return NextResponse.json({ activation });
  } catch (error) {
    console.error("Failed to create resource activation", error);
    return NextResponse.json({ error: "Unable to create activation request." }, { status: 500 });
  }
}
