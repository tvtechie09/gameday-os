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
  };
}

export async function listWorkOrderPhotos(order: WorkOrder): Promise<WorkOrderPhoto[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_order_photos")
    .select("*")
    .eq("work_order_id", order.id)
    .eq("venue_id", order.venueId)
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
  const { count, error: countError } = await supabase
    .from("work_order_photos")
    .select("id", { count: "exact", head: true })
    .eq("work_order_id", input.order.id)
    .eq("venue_id", input.order.venueId)
    .is("removed_at", null);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= WORK_ORDER_PHOTO_MAX_COUNT) throw new Error("This work order already has the maximum of 5 photos.");

  const mediaId = randomUUID();
  const storageKey = `${input.order.venueId}/work-orders/${input.order.id}/${mediaId}.${descriptor.extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storageKey, bytes, {
    contentType: descriptor.mimeType,
    upsert: false,
    cacheControl: "private, max-age=300",
  });
  if (uploadError) throw new Error("Photo upload failed.");

  const { data, error } = await supabase.from("work_order_photos").insert({
    id: mediaId,
    work_order_id: input.order.id,
    venue_id: input.order.venueId,
    uploader_actor_user_id: input.ctx.userId,
    storage_key: storageKey,
    purpose: input.purpose,
    mime_type: descriptor.mimeType,
    byte_size: bytes.byteLength,
  }).select("*").single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storageKey]).catch(() => undefined);
    throw new Error(error.message);
  }
  return mapPhoto(data);
}

export async function removeWorkOrderPhoto(mediaId: string, order: WorkOrder, ctx: AccessContext): Promise<WorkOrderPhoto> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_order_photos")
    .update({ removed_at: new Date().toISOString(), removed_by_actor_user_id: ctx.userId })
    .eq("id", mediaId)
    .eq("work_order_id", order.id)
    .eq("venue_id", order.venueId)
    .is("removed_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Photo evidence not found.");
  await supabase.storage.from(BUCKET).remove([data.storage_key]).catch(() => undefined);
  return mapPhoto(data);
}
