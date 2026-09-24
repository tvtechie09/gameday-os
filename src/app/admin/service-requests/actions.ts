"use server";

import { revalidatePath } from "next/cache";
import { resolveSession } from "@/lib/access/session";
import { canViewCommandCenter } from "@/lib/access/capabilities";
import { assertFieldInScope } from "@/lib/access/scoped-venue-data";
import { PermissionDeniedError } from "@/lib/services/identity";
import { getVenueServiceRequests, transitionVenueServiceRequest } from "@/lib/services/venue-service-requests";
import { isVenueServiceRequestStatus } from "@/lib/services/venue-service-request-core";

export async function transitionServiceRequestAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  const nextStatusValue = String(formData.get("next_status") ?? "").trim();
  if (!requestId || !isVenueServiceRequestStatus(nextStatusValue)) return;

  const session = await resolveSession();
  if (session.kind !== "active" || !canViewCommandCenter(session.context)) {
    throw new PermissionDeniedError();
  }

  const request = (await getVenueServiceRequests()).find((item) => item.id === requestId);
  if (!request) return;
  await assertFieldInScope(request.fieldId);
  await transitionVenueServiceRequest({
    requestId,
    nextStatus: nextStatusValue,
    actorUserId: session.context.userId,
    actorLabel: session.context.displayName || session.context.email,
    note: String(formData.get("note") ?? "") || null,
  });
  revalidatePath("/admin/service-requests");
}
