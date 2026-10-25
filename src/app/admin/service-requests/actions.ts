"use server";

import { revalidatePath } from "next/cache";
import { resolveSession } from "@/lib/access/session";
import { canViewCommandCenter } from "@/lib/access/capabilities";
import { assertVenueInScope } from "@/lib/access/scoped-venue-data";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVenueServiceRequestById, transitionVenueServiceRequest } from "@/lib/services/venue-service-requests";
import { isVenueServiceRequestStatus } from "@/lib/services/venue-service-request-core";

export async function transitionServiceRequestAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  const nextStatusValue = String(formData.get("next_status") ?? "").trim();
  if (!requestId || !isVenueServiceRequestStatus(nextStatusValue)) return;

  const session = await resolveSession();
  if (session.kind !== "active" || !canViewCommandCenter(session.context)) {
    throw new PermissionDeniedError();
  }

  const request = await getVenueServiceRequestById(requestId);
  if (!request) return;
  // The venue is durable and non-null even if a field is later deleted. Guard
  // the canonical tenant boundary instead of treating a null field as global.
  await assertVenueInScope(request.venueId);
  await transitionVenueServiceRequest({
    requestId,
    nextStatus: nextStatusValue,
    actorUserId: session.context.userId,
    actorLabel: session.context.displayName || session.context.email,
    note: String(formData.get("note") ?? "") || null,
  });
  revalidatePath("/admin/service-requests");
}
