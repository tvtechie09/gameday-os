import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { alertPriorities, alertScopes, alertTypes, alertVisibilities, getAlert, getAlertPriorityLabel, getAlertScopeLabel, updateAlert } from "@/lib/services/alerts";
import { getFields } from "@/lib/services/fields";
import { getTournaments } from "@/lib/services/tournaments";
import { getVenues } from "@/lib/services/venues";
import { readAlertFormData } from "../../form-utils";

type EditAlertPageProps = {
  params: Promise<{ alertId: string }>;
};

function toDateTimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

export const dynamic = "force-dynamic";

export default async function EditAlertPage({ params }: EditAlertPageProps) {
  const { alertId } = await params;
  const [alert, venues, fields, tournaments] = await Promise.all([getAlert(alertId), getVenues(), getFields(), getTournaments()]);

  async function updateAlertAction(formData: FormData) {
    "use server";

    const parsed = readAlertFormData(formData);
    if ("error" in parsed) {
      return;
    }

    await updateAlert(alertId, parsed.data);
    revalidatePath("/admin/alerts");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/tournaments");
    revalidatePath("/fields/[fieldId]", "page");
    redirect("/admin/alerts");
  }

  if (!alert) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/alerts" className="text-sm font-bold text-[var(--accent-strong)]">Back to alerts</Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Alert not found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/alerts" className="text-sm font-bold text-[var(--accent-strong)]">Back to alerts</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Communications</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit alert</h1>
      </div>
      <form action={updateAlertAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Title</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.title} name="title" required />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Message</span>
          <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={alert.message} name="message" required />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Alert type</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.alertType} name="alert_type" required>
              {alertTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Scope</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.alertScope} name="alert_scope" required>
              {alertScopes.map((scope) => <option key={scope} value={scope}>{getAlertScopeLabel(scope)}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Priority</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.alertPriority} name="alert_priority" required>
              {alertPriorities.map((priority) => <option key={priority} value={priority}>{getAlertPriorityLabel(priority)}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Visibility</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.alertVisibility} name="alert_visibility" required>
              {alertVisibilities.map((visibility) => <option key={visibility} value={visibility}>{visibility.replace("_", " ")}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Venue</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.venueId} name="venue_id" required>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Tournament</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.tournamentId ?? ""} name="tournament_id">
              <option value="">All tournaments</option>
              {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Field</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={alert.fieldId ?? ""} name="field_id">
              <option value="">All fields</option>
              {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Start time</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={toDateTimeLocal(alert.startTime)} name="start_time" required type="datetime-local" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">End time</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={toDateTimeLocal(alert.endTime)} name="end_time" required type="datetime-local" />
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-lg bg-white p-4 text-sm font-bold">
          <input className="h-5 w-5 accent-[var(--accent)]" defaultChecked={alert.isActive} name="is_active" type="checkbox" />
          Active
        </label>
        <div className="flex justify-end border-t border-[var(--line)] pt-5">
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
            Save alert
          </button>
        </div>
      </form>
    </section>
  );
}
