"use server";

import { revalidatePath } from "next/cache";
import { isDevLoginEnabled, resolveSession } from "@/lib/access/session";
import { getVerifiedVenueActorId } from "@/lib/supabase/server-auth";
import { resolveProviderConflict, reviewProviderMapping } from "@/lib/services/integration-data-quality";

function refresh() {
  revalidatePath("/admin/integrations");
  revalidatePath("/admin/integrations/quality");
  revalidatePath("/admin/integrations/health");
}

async function integrationActorId() {
  try {
    return await getVerifiedVenueActorId();
  } catch (error) {
    if (!isDevLoginEnabled()) throw error;
    const session = await resolveSession();
    if (session.kind === "active") return session.context.userId;
    throw error;
  }
}

export async function resolveProviderConflictAction(formData: FormData) {
  const conflictId = String(formData.get("conflict_id") || "");
  const action = String(formData.get("action") || "") as "keep_current" | "choose_provider_a" | "choose_provider_b" | "ignore";
  if (!conflictId || !["keep_current", "choose_provider_a", "choose_provider_b", "ignore"].includes(action)) return;
  await resolveProviderConflict({ conflictId, action }, await integrationActorId());
  refresh();
}

export async function reviewProviderMappingAction(formData: FormData) {
  const mappingId = String(formData.get("mapping_id") || "");
  const action = String(formData.get("action") || "") as "approve" | "reject";
  if (!mappingId || !["approve", "reject"].includes(action)) return;
  await reviewProviderMapping({ mappingId, action }, await integrationActorId());
  refresh();
}
