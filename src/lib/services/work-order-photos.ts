import "server-only";

import { randomUUID } from "node:crypto";
import type { AccessContext } from "@/lib/access/capabilities";
import type { Database } from "@/lib/supabase/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  matchesWorkOrderPhotoSignature,
  validateWorkOrderPhotoDescriptor,
  WORK_ORDER_PHOTO_MAX_COUNT,
  WorkOrderPhotoValidationError,
  type WorkOrderPhotoPurpose,
} from "@/lib/work-order-photo-core";
import type { WorkOrder } from "@/lib/services/work-orders";

const BUCKET = "work-order-evidence";
const SIGNED_URL_SECONDS = 300;
type PhotoRow = Database["public"]["Tables"]["work_order_photos"]["Row"];

export type WorkOrderPhoto = {
  id: string;
  workOrderId: string;
  venueId: string;
  uploaderActorUserId: string | null;
  purpose: WorkOrderPhotoPurpose;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  signedUrl: string;
  storageCleanupPending: boolean;
};

function mapPhoto(row: PhotoRow, signedUrl = ""): WorkOrderPhoto {
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    venueId: row.venue_id,
    uploaderActorUserId: row.uploader_actor_user_id,
    purpose: row.purpose as WorkOrderPhotoPurpose,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    signedUrl,
    storageCleanupPending: row.storage_status === "DELETE_PENDING",
  };
}

async function reconcileIncompletePhotoStorage(order: WorkOrder): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("work_order_photos")
    .select("*")
    .eq("work_order_id", order.id)
    .eq("venue_id", order.venueId)
    .in("storage_status", ["PENDING", "DELETE_PENDING"])
    .limit(WORK_ORDER_PHOTO_MAX_COUNT);

  for (const row of data ?? []) {
    if (row.storage_status === "PENDING" && row.storage_updated_at >= staleBefore) continue;
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([row.storage_key]);
    await supabase.from("work_order_photos").update({
      removed_at: row.removed_at ?? new Date().toISOString(),
      storage_status: removeError ? "DELETE_PENDING" : row.storage_status === "PENDING" ? "FAILED" : "REMOVED",
      storage_error_code: removeError ? "STORAGE_DELETE_FAILED" : row.storage_status === "PENDING" ? "STALE_UPLOAD_CLEANED" : null,
      storage_updated_at: new Date().toISOString(),
    }).eq("id", row.id).eq("work_order_id", order.id).eq("venue_id", order.venueId);
  }
}

export async function listWorkOrderPhotos(order: WorkOrder): Promise<WorkOrderPhoto[]> {
  const supabase = getSupabaseAdminClient();
  await reconcileIncompletePhotoStorage(order);
  const { data, error } = await supabase
    .from("work_order_photos")
    .select("*")
    .eq("work_order_id", order.id)
    .eq("venue_id", order.venueId)
    .eq("storage_status", "ACTIVE")
    .is("removed_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return Promise.all((data ?? []).map(async (row) => {
    const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_key, SIGNED_URL_SECONDS);
    if (signedError) throw new Error("Photo evidence is temporarily unavailable.");
    return mapPhoto(row, signed.signedUrl);
  }));
}

export async function getWorkOrderPhotoRecord(mediaId: string, order: WorkOrder): Promise<WorkOrderPhoto | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("work_order_photos")
    .select("*")
    .eq("id", mediaId)
    .eq("work_order_id", order.id)
    .eq("venue_id", order.venueId)
    .eq("storage_status", "ACTIVE")
    .is("removed_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPhoto(data) : null;
}

export async function uploadWorkOrderPhoto(input: {
  order: WorkOrder;
  ctx: AccessContext;
  file: File;
  purpose: WorkOrderPhotoPurpose;
}): Promise<WorkOrderPhoto> {
  const descriptor = validateWorkOrderPhotoDescriptor(input.file);
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (!matchesWorkOrderPhotoSignature(bytes, descriptor.mimeType)) {
    throw new WorkOrderPhotoValidationError("Photo content does not match its image type.");
  }

  const supabase = getSupabaseAdminClient();
  const mediaId = randomUUID();
  const storageKey = `${input.order.venueId}/work-orders/${input.order.id}/${mediaId}.${descriptor.extension}`;
  const { data: reserved, error: reserveError } = await supabase.from("work_order_photos").insert({
    id: mediaId,
    work_order_id: input.order.id,
    venue_id: input.order.venueId,
    uploader_actor_user_id: input.ctx.userId,
    storage_key: storageKey,
    purpose: input.purpose,
    mime_type: descriptor.mimeType,
    byte_size: bytes.byteLength,
    storage_status: "PENDING",
    storage_updated_at: new Date().toISOString(),
  }).select("*").single();

  if (reserveError) {
    if (reserveError.message.includes("WORK_ORDER_PHOTO_LIMIT_REACHED")) {
      throw new Error("This work order already has the maximum of 5 photos.");
    }
    throw new Error("Photo upload could not be reserved.");
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storageKey, bytes, {
    contentType: descriptor.mimeType,
    upsert: false,
    cacheControl: "private, max-age=300",
  });
  if (uploadError) {
    await supabase.from("work_order_photos").update({
      removed_at: new Date().toISOString(),
      storage_status: "FAILED",
      storage_error_code: "STORAGE_UPLOAD_FAILED",
      storage_updated_at: new Date().toISOString(),
    }).eq("id", reserved.id);
    throw new Error("Photo upload failed.");
  }

  const { data, error } = await supabase.from("work_order_photos").update({
    storage_status: "ACTIVE",
    storage_error_code: null,
    storage_updated_at: new Date().toISOString(),
  }).eq("id", reserved.id).eq("storage_status", "PENDING").select("*").single();

  if (error) {
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([storageKey]);
    await supabase.from("work_order_photos").update({
      removed_at: new Date().toISOString(),
      storage_status: cleanupError ? "DELETE_PENDING" : "FAILED",
      storage_error_code: cleanupError ? "STORAGE_DELETE_FAILED" : "PHOTO_FINALIZE_FAILED",
      storage_updated_at: new Date().toISOString(),
    }).eq("id", reserved.id);
    throw new Error("Photo upload could not be finalized.");
  }
  return mapPhoto(data);
}

export async function removeWorkOrderPhoto(mediaId: string, order: WorkOrder, ctx: AccessContext): Promise<WorkOrderPhoto> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_order_photos")
    .update({
      removed_at: new Date().toISOString(),
      removed_by_actor_user_id: ctx.userId,
      storage_status: "DELETE_PENDING",
      storage_error_code: null,
      storage_updated_at: new Date().toISOString(),
    })
    .eq("id", mediaId)
    .eq("work_order_id", order.id)
    .eq("venue_id", order.venueId)
    .is("removed_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Photo evidence not found.");
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([data.storage_key]);
  const { data: finalized } = await supabase.from("work_order_photos").update({
    storage_status: removeError ? "DELETE_PENDING" : "REMOVED",
    storage_error_code: removeError ? "STORAGE_DELETE_FAILED" : null,
    storage_updated_at: new Date().toISOString(),
  }).eq("id", data.id).select("*").single();
  return mapPhoto(finalized ?? data);
}
