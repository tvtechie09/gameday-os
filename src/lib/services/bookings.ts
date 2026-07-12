import { getSupabaseAdminClient } from "@/lib/supabase/server";

// Field allocation & permits: outside groups (travel orgs, rec programs,
// permit holders) reserve field time. Conflicts are checked against both
// existing bookings and scheduled sessions on the same field.

export type FieldBooking = {
  id: string;
  fieldId: string;
  organizationName: string;
  purpose: string;
  contactName: string | null;
  contactEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
};

export type BookingConflict = {
  kind: "booking" | "session";
  label: string;
  startsAt: string;
  endsAt: string | null;
};

export type CreateBookingInput = {
  fieldId: string;
  organizationName: string;
  purpose: string;
  contactName?: string | null;
  contactEmail?: string | null;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
};

function mapBooking(row: {
  id: string;
  field_id: string;
  organization_name: string;
  purpose: string;
  contact_name: string | null;
  contact_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
}): FieldBooking {
  return {
    id: row.id,
    fieldId: row.field_id,
    organizationName: row.organization_name,
    purpose: row.purpose,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    notes: row.notes,
  };
}

export async function getUpcomingBookings(): Promise<FieldBooking[]> {
  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return [];
  }
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const { data, error } = await supabase
    .from("field_bookings")
    .select("*")
    .gte("ends_at", since.toISOString())
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(200);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapBooking);
}

// Overlap rule: existing.start < new.end AND existing.end > new.start.
// Sessions have no reliable end when end_time is null; assume 2 hours.
export async function findBookingConflicts(fieldId: string, startsAt: string, endsAt: string): Promise<BookingConflict[]> {
  const supabase = getSupabaseAdminClient();
  const conflicts: BookingConflict[] = [];

  const { data: bookings } = await supabase
    .from("field_bookings")
    .select("organization_name,purpose,starts_at,ends_at,status")
    .eq("field_id", fieldId)
    .neq("status", "cancelled")
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt);
  for (const row of bookings ?? []) {
    conflicts.push({ kind: "booking", label: `${row.organization_name} (${row.purpose})`, startsAt: row.starts_at, endsAt: row.ends_at });
  }

  const windowStart = new Date(new Date(startsAt).getTime() - 6 * 60 * 60 * 1000).toISOString();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("title,home_team,away_team,start_time,end_time")
    .eq("field_id", fieldId)
    .gte("start_time", windowStart)
    .lt("start_time", endsAt);
  for (const session of sessions ?? []) {
    const sessionEnd = session.end_time ?? new Date(new Date(session.start_time).getTime() + 2 * 60 * 60 * 1000).toISOString();
    if (session.start_time < endsAt && sessionEnd > startsAt) {
      const label = session.title || `${session.home_team} vs. ${session.away_team}`;
      conflicts.push({ kind: "session", label, startsAt: session.start_time, endsAt: session.end_time });
    }
  }

  return conflicts.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function createBooking(input: CreateBookingInput): Promise<{ booking: FieldBooking; conflicts: BookingConflict[] }> {
  const supabase = getSupabaseAdminClient();
  const conflicts = await findBookingConflicts(input.fieldId, input.startsAt, input.endsAt);
  const { data, error } = await supabase
    .from("field_bookings")
    .insert({
      field_id: input.fieldId,
      organization_name: input.organizationName.trim().slice(0, 120),
      purpose: input.purpose.trim().slice(0, 60) || "permit",
      contact_name: input.contactName?.trim().slice(0, 120) || null,
      contact_email: input.contactEmail?.trim().toLowerCase().slice(0, 254) || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      notes: input.notes?.trim().slice(0, 500) || null,
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return { booking: mapBooking(data), conflicts };
}

export async function cancelBooking(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("field_bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
