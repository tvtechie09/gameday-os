"use server";

import { revalidatePath } from "next/cache";
import { assignOfficial, getOfficial, removeOfficial } from "@/lib/services/officials";
import { getPublicAppUrl } from "@/lib/public-url";
import { publicErrorMessage } from "@/lib/public-error";
import { requireScheduleAccess } from "@/lib/access/schedule-authorization";

export type AssignOfficialResult = {
  ok: boolean;
  error?: string;
  conflicts?: string[];
  confirmUrl?: string;
};

export async function assignOfficialAction(formData: FormData): Promise<AssignOfficialResult> {
  try {
    const sessionId = String(formData.get("sessionId") || "");
    const name = String(formData.get("name") || "").trim();
    if (!sessionId || name.length < 2) {
      return { ok: false, error: "Pick a game and enter the official's name." };
    }
    await requireScheduleAccess({ sessionIds: [sessionId] });
    const result = await assignOfficial({
      sessionId,
      name,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      role: String(formData.get("role") || "umpire"),
      confirmBaseUrl: getPublicAppUrl(),
    });
    revalidatePath("/admin/sessions/officials");
    return { ok: true, conflicts: result.conflicts, confirmUrl: result.confirmUrl };
  } catch (error) {
    return { ok: false, error: publicErrorMessage(error, "Unable to assign the official.") };
  }
}

export async function removeOfficialAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) return;
  try {
    const official = await getOfficial(id);
    if (!official) return;
    await requireScheduleAccess({ sessionIds: [official.sessionId] });
    await removeOfficial(id);
  } catch {
    // Row stays; page re-render shows current state.
  }
  revalidatePath("/admin/sessions/officials");
}
