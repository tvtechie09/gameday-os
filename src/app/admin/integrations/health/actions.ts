"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runExternalSourceTestSync, updateExternalSourceStatus } from "@/lib/services/external-sources";
import type { ExternalSourceStatus } from "@/lib/types";

const healthStatuses: ExternalSourceStatus[] = ["connected", "not_configured", "error", "paused", "unknown"];

function readHealthStatus(value: FormDataEntryValue | null): ExternalSourceStatus {
  const rawValue = String(value ?? "");
  return healthStatuses.find((status) => status === rawValue) ?? "unknown";
}

function revalidateHealthSurfaces() {
  revalidatePath("/admin/integrations");
  revalidatePath("/admin/integrations/health");
}

export async function updateExternalSourceHealthAction(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "").trim();
  if (!sourceId) return;

  await updateExternalSourceStatus(sourceId, readHealthStatus(formData.get("source_status")));
  revalidateHealthSurfaces();
}

export async function runTestSyncAction(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "").trim();
  if (!sourceId) return;

  await runExternalSourceTestSync(sourceId);
  revalidateHealthSurfaces();
  redirect("/admin/integrations/health?sync=success");
}
