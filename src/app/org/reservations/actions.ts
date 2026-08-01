"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isOrgScoped } from "@/lib/access/capabilities";
import { getSessionContext } from "@/lib/access/session";
import { cancelClaim } from "@/lib/services/field-reservations";
import { publicErrorMessage } from "@/lib/public-error";

const BASE = "/org/reservations";

// The org-console counterpart to the staff-side cancelClaimAction in
// admin/fields/reservations/actions.ts. Does NOT require venue staff --
// cancelClaim itself now authorizes "this claim belongs to a grant made to
// MY organization" as a second, narrower path alongside the staff override.
export async function cancelOwnClaimAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx || !isOrgScoped(ctx)) {
    redirect(BASE + "?error=" + encodeURIComponent("You do not have permission to cancel this reservation."));
  }

  const id = String(formData.get("claim_id") ?? "");
  if (id) {
    try {
      await cancelClaim(id, ctx);
    } catch (error) {
      revalidatePath(BASE);
      redirect(BASE + "?error=" + encodeURIComponent(publicErrorMessage(error, "Could not cancel the reservation.")));
    }
  }
  revalidatePath(BASE);
  redirect(BASE);
}
