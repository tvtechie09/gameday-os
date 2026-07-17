"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canManageFields, isPlatformAdmin } from "@/lib/access/capabilities";
import {
  approveClaim,
  cancelClaim,
  createGrant,
  denyClaim,
  setGrantStatus,
  type ClaimMode,
} from "@/lib/services/field-reservations";
import { publicErrorMessage } from "@/lib/public-error";

const BASE = "/admin/fields/reservations";

async function requireStaff() {
  const ctx = await getSessionContext();
  if (!ctx || (!isPlatformAdmin(ctx) && !canManageFields(ctx))) {
    redirect(BASE + "?error=" + encodeURIComponent("You do not have permission to manage field reservations."));
  }
  return ctx;
}

// "18:30" -> 1110 minutes from midnight. Returns null on anything malformed.
function timeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 24 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export async function createGrantAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();

  const days = formData.getAll("days").map((d) => Number(d)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const startMin = timeToMinutes(String(formData.get("window_start") ?? ""));
  const endMin = timeToMinutes(String(formData.get("window_end") ?? ""));
  if (startMin === null || endMin === null) {
    redirect(BASE + "?error=" + encodeURIComponent("Enter valid start and end times (HH:MM)."));
  }

  try {
    const grant = await createGrant({
      fieldId: String(formData.get("field_id") ?? ""),
      granteeName: String(formData.get("grantee_name") ?? ""),
      claimMode: String(formData.get("claim_mode") ?? "first_come") === "approval" ? "approval" : ("first_come" as ClaimMode),
      recurrence: {
        daysOfWeek: days,
        windowStartMinute: startMin!,
        windowEndMinute: endMin!,
        slotMinutes: Number(formData.get("slot_minutes") ?? 90),
        seasonStartDate: String(formData.get("season_start") ?? ""),
        seasonEndDate: String(formData.get("season_end") ?? ""),
      },
      notes: String(formData.get("notes") ?? "") || null,
      isDemo: String(formData.get("is_demo") ?? "") === "on",
    }, ctx);
    revalidatePath(BASE);
    redirect(`${BASE}?grant=${grant.id}&created=1`);
  } catch (error) {
    // redirect() throws NEXT_REDIRECT; let it propagate.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect(BASE + "?error=" + encodeURIComponent(publicErrorMessage(error, "Could not create the block.")));
  }
}

export async function endGrantAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = String(formData.get("grant_id") ?? "");
  if (id) {
    try {
      await setGrantStatus(id, "ended", ctx);
    } catch {
      // page re-render shows it unchanged
    }
  }
  revalidatePath(BASE);
  redirect(`${BASE}?grant=${id}`);
}

export async function cancelClaimAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = String(formData.get("claim_id") ?? "");
  const grantId = String(formData.get("grant_id") ?? "");
  if (id) {
    try {
      await cancelClaim(id, ctx);
    } catch {
      /* leave as-is */
    }
  }
  revalidatePath(BASE);
  redirect(`${BASE}?grant=${grantId}`);
}

export async function approveClaimAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = String(formData.get("claim_id") ?? "");
  const grantId = String(formData.get("grant_id") ?? "");
  let error: string | null = null;
  if (id) {
    try {
      const res = await approveClaim(id, ctx);
      if (!res.ok) error = res.message ?? "Could not approve.";
    } catch (e) {
      error = publicErrorMessage(e, "Could not approve.");
    }
  }
  revalidatePath(BASE);
  redirect(`${BASE}?grant=${grantId}${error ? "&error=" + encodeURIComponent(error) : ""}`);
}

export async function denyClaimAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = String(formData.get("claim_id") ?? "");
  const grantId = String(formData.get("grant_id") ?? "");
  if (id) {
    try {
      await denyClaim(id, ctx);
    } catch {
      /* leave as-is */
    }
  }
  revalidatePath(BASE);
  redirect(`${BASE}?grant=${grantId}`);
}
