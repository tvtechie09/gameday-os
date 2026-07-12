import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import { getUpcomingBookings, type FieldBooking } from "@/lib/services/bookings";
import { cancelBookingAction } from "./actions";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

function formatWindow(booking: FieldBooking) {
  const format = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
  const end = new Intl.DateTimeFormat("en", { timeStyle: "short" });
  return `${format.format(new Date(booking.startsAt))} – ${end.format(new Date(booking.endsAt))}`;
}

export default async function FieldBookingsPage() {
  let errorMessage: string | null = null;
  let bookings: FieldBooking[] = [];
  let fieldOptions: Array<{ id: string; name: string; venueName: string }> = [];
  const fieldNameById = new Map<string, string>();

  try {
    const [venues, fields, upcoming] = await Promise.all([getVenues(), getFields(), getUpcomingBookings()]);
    const venueById = new Map(venues.map((venue) => [venue.id, venue]));
    fieldOptions = fields.map((field) => ({ id: field.id, name: field.name, venueName: venueById.get(field.venueId)?.name ?? "Venue" }));
    for (const field of fields) fieldNameById.set(field.id, field.name);
    bookings = upcoming;
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load field bookings.");
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Fields</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Field allocation &amp; permits</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Reserve field time for outside groups, permits, camps, and maintenance holds. Overlaps with
        scheduled games or other bookings are flagged when you save.
      </p>
      <p className="mt-2 text-sm">
        <Link className="font-bold text-[var(--accent-strong)] underline" href="/admin/fields">
          Back to Fields
        </Link>
      </p>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          <BookingForm fields={fieldOptions} />

          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-black">Upcoming reservations</h2>
            {bookings.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No upcoming reservations.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                      <th className="py-2 pr-3">Field</th>
                      <th className="py-2 pr-3">Group</th>
                      <th className="py-2 pr-3">Purpose</th>
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-[var(--line)] last:border-0">
                        <td className="py-2 pr-3 font-bold">{fieldNameById.get(booking.fieldId) ?? "Field"}</td>
                        <td className="py-2 pr-3">{booking.organizationName}</td>
                        <td className="py-2 pr-3">{booking.purpose}</td>
                        <td className="py-2 pr-3">{formatWindow(booking)}</td>
                        <td className="py-2 text-right">
                          <form action={cancelBookingAction}>
                            <input name="id" type="hidden" value={booking.id} />
                            <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-bold" type="submit">
                              Cancel
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
