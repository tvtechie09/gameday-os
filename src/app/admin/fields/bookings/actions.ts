"use server";

import { revalidatePath } from "next/cache";
import { cancelBooking, createBooking, type BookingConflict } from "@/lib/services/bookings";
import { publicErrorMessage } from "@/lib/public-error";

export type CreateBookingResult = {
  ok: boolean;
  error?: string;
  conflicts?: BookingConflict[];
};

export async function createBookingAction(formData: FormData): Promise<CreateBookingResult> {
  try {
    const fieldId = String(formData.get("fieldId") || "");
    const organizationName = String(formData.get("organizationName") || "").trim();
    const purpose = String(formData.get("purpose") || "permit");
    const date = String(formData.get("date") || "");
    const startTime = String(formData.get("startTime") || "");
    const endTime = String(formData.get("endTime") || "");
    if (!fieldId || !organizationName || !date || !startTime || !endTime) {
      return { ok: false, error: "Field, group name, date, and times are required." };
    }
    const startsAt = new Date(`${date}T${startTime}`);
    const endsAt = new Date(`${date}T${endTime}`);
    if (!(startsAt.getTime() < endsAt.getTime())) {
      return { ok: false, error: "End time must be after the start time." };
    }
    const { conflicts } = await createBooking({
      fieldId,
      organizationName,
      purpose,
      contactName: String(formData.get("contactName") || "") || null,
      contactEmail: String(formData.get("contactEmail") || "") || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      notes: String(formData.get("notes") || "") || null,
    });
    revalidatePath("/admin/fields/bookings");
    return { ok: true, conflicts };
  } catch (error) {
    return { ok: false, error: publicErrorMessage(error, "Unable to create the booking.") };
  }
}

export async function cancelBookingAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) return;
  try {
    await cancelBooking(id);
  } catch {
    // Leave the row; the page re-render shows it unchanged.
  }
  revalidatePath("/admin/fields/bookings");
}
