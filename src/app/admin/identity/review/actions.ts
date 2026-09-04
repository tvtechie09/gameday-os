"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  decideIdentityReviewCase,
  processPlatformIdentityProjectionQueue,
  retryIdentityProjection,
} from "@/lib/services/platform-identity-review";

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) throw new Error("The identity review request is incomplete.");
  return value.trim();
}

function resultUrl(organizationId: string, caseId: string, result: string) {
  const query = new URLSearchParams({ organizationId, result });
  return "/admin/identity/review/" + encodeURIComponent(caseId) + "?" + query.toString();
}

async function decide(formData: FormData, action: "LINK" | "KEEP_SEPARATE" | "DEFER") {
  const organizationId = required(formData, "organizationId");
  const caseId = required(formData, "caseId");
  const expectedVersion = Number(required(formData, "expectedVersion"));
  const candidate = formData.get("candidatePersonId");
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("The identity review version is invalid.");
  try {
    const result = await decideIdentityReviewCase({
      organizationId,
      caseId,
      action,
      candidatePersonId: typeof candidate === "string" && candidate ? candidate : null,
      expectedVersion,
    });
    if (result.projectionQueueId) await processPlatformIdentityProjectionQueue({ maxItems: 5 }).catch(() => null);
  } catch (error) {
    const stale = error instanceof Error && error.message.includes("changed after you opened it");
    redirect(resultUrl(organizationId, caseId, stale ? "stale" : "failed"));
  }
  revalidatePath("/admin/identity/review");
  revalidatePath("/admin/identity/review/" + caseId);
  redirect(resultUrl(organizationId, caseId, action === "DEFER" ? "deferred" : action === "LINK" ? "linked" : "separate"));
}

export async function linkIdentityRecordsAction(formData: FormData) {
  await decide(formData, "LINK");
}

export async function keepIdentitySeparateAction(formData: FormData) {
  await decide(formData, "KEEP_SEPARATE");
}

export async function deferIdentityReviewAction(formData: FormData) {
  await decide(formData, "DEFER");
}

export async function retryIdentityProjectionAction(formData: FormData) {
  const organizationId = required(formData, "organizationId");
  const caseId = required(formData, "caseId");
  const queueId = required(formData, "queueId");
  try {
    await retryIdentityProjection(organizationId, queueId);
    await processPlatformIdentityProjectionQueue({ maxItems: 5 });
  } catch {
    redirect(resultUrl(organizationId, caseId, "retry-failed"));
  }
  revalidatePath("/admin/identity/review/" + caseId);
  redirect(resultUrl(organizationId, caseId, "retry-requested"));
}
