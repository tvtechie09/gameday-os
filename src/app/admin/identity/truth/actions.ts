"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processPlatformIdentityProjectionQueue, retryIdentityProjection } from "@/lib/services/platform-identity-review";

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) throw new Error("The projection retry request is incomplete.");
  return value.trim();
}

export async function retryTruthProjectionAction(formData: FormData) {
  const organizationId = required(formData, "organizationId");
  const personId = required(formData, "personId");
  const queueId = required(formData, "queueId");
  const destination = "/admin/identity/truth/" + encodeURIComponent(personId) + "?" + new URLSearchParams({ organizationId });
  let result = "retry-requested";
  try {
    await retryIdentityProjection(organizationId, queueId);
    await processPlatformIdentityProjectionQueue({ maxItems: 5 });
  } catch {
    result = "retry-failed";
  }
  revalidatePath("/admin/identity/truth/" + personId);
  redirect(destination + "&result=" + result);
}

