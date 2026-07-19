import { NextResponse } from "next/server";
import { createVolunteerRoleRequest, volunteerRoleTypes } from "@/lib/services/volunteer-roles";
import type { VolunteerRoleType } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type VolunteerRolePayload = {
  venueId?: unknown;
  fieldId?: unknown;
  sessionId?: unknown;
  roleType?: unknown;
  displayName?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  notes?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const limit = rateLimit(`volunteer:${clientIp(request)}`, 15, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  try {
    const payload = await request.json() as VolunteerRolePayload;
    const venueId = readString(payload.venueId);
    const fieldId = readString(payload.fieldId);
    const roleType = readString(payload.roleType);
    const displayName = readString(payload.displayName);

    if (!venueId || !fieldId || !displayName) {
      return NextResponse.json({ error: "Venue, field, and display name are required." }, { status: 400 });
    }

    if (!volunteerRoleTypes.includes(roleType as VolunteerRoleType)) {
      return NextResponse.json({ error: "Choose a valid volunteer role." }, { status: 400 });
    }

    const role = await createVolunteerRoleRequest({
      venue_id: venueId,
      field_id: fieldId,
      session_id: readString(payload.sessionId) || null,
      role_type: roleType as VolunteerRoleType,
      display_name: displayName,
      contact_name: readString(payload.contactName) || null,
      contact_email: readString(payload.contactEmail) || null,
      contact_phone: readString(payload.contactPhone) || null,
      notes: readString(payload.notes) || null,
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Failed to create volunteer role", error);
    return NextResponse.json({ error: "Unable to create volunteer role request." }, { status: 500 });
  }
}
