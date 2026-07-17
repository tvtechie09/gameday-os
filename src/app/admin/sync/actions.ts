"use server";

import { revalidatePath } from "next/cache";
import { importSyncQueueItem, updateSyncQueueReviewStatus } from "@/lib/services/sync-engine";

function revalidateSyncPaths() {
  revalidatePath("/admin/sync");
  revalidatePath("/admin/sync/jobs");
  revalidatePath("/admin/sync/review");
  revalidatePath("/admin/sessions");
}

export async function approveSyncQueueItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await updateSyncQueueReviewStatus(id, "approved");
  revalidateSyncPaths();
}

export async function rejectSyncQueueItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await updateSyncQueueReviewStatus(id, "rejected");
  revalidateSyncPaths();
}

export async function importSyncQueueItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await importSyncQueueItem(id);
  revalidateSyncPaths();
}
