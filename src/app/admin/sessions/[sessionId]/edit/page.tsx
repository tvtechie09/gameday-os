import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getFields } from "@/lib/services/fields";
import { getSession, updateSession } from "@/lib/services/sessions";
import { getTournaments } from "@/lib/services/tournaments";
import type { SessionLinkLabel, SessionSportType } from "@/lib/types";

type EditSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

const linkLabels: SessionLinkLabel[] = ["GameChanger", "SidelineHD", "YouTube", "SportsEngine", "TeamSnap", "Other"];
const sportTypes: SessionSportType[] = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"];

function toDateTimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value : null;
}

function readLinkLabel(formData: FormData, key: string): SessionLinkLabel | null {
  const value = readOptionalText(formData, key);
  return linkLabels.find((label) => label === value) ?? null;
}

export const dynamic = "force-dynamic";

export default async function EditSessionPage({ params }: EditSessionPageProps) {
  const { sessionId } = await params;
  const [session, fields, tournaments] = await Promise.all([getSession(sessionId), getFields(), getTournaments()]);

  async function updateSessionAction(formData: FormData) {
    "use server";

    const fieldId = String(formData.get("field_id") ?? "").trim();
    const tournamentId = String(formData.get("tournament_id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const sportType = String(formData.get("sport_type") ?? "baseball").trim();
    const homeTeam = String(formData.get("home_team") ?? "").trim();
    const awayTeam = String(formData.get("away_team") ?? "").trim();
    const startTime = String(formData.get("start_time") ?? "").trim();
    const endTime = String(formData.get("end_time") ?? "").trim();
    const status = String(formData.get("status") ?? "scheduled").trim();

    if (!fieldId || !title || !homeTeam || !awayTeam || !startTime) {
      return;
    }

    await updateSession(sessionId, {
      field_id: fieldId,
      tournament_id: tournamentId || null,
      title,
      sport_type: sportTypes.find((type) => type === sportType) ?? "baseball",
      home_team: homeTeam,
      away_team: awayTeam,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      status: status === "active" || status === "final" ? status : "scheduled",
      is_demo: formData.get("is_demo") === "on",
      primary_link_label: readLinkLabel(formData, "primary_link_label"),
      primary_link_url: readOptionalText(formData, "primary_link_url"),
      secondary_link_label: readLinkLabel(formData, "secondary_link_label"),
      secondary_link_url: readOptionalText(formData, "secondary_link_url"),
      notes: readOptionalText(formData, "notes"),
    });

    revalidatePath("/admin/sessions");
    revalidatePath(`/admin/sessions/${sessionId}`);
    redirect("/admin/sessions");
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/sessions" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to sessions
        </Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Session not found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/sessions" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to sessions
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sessions</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit session</h1>
      </div>

      <form action={updateSessionAction} className="mt-8 grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Field</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.fieldId} name="field_id" required>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Session title</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.title} name="title" required />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Tournament</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.tournamentId ?? ""} name="tournament_id">
            <option value="">No tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold">Sport</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.sportType} name="sport_type" required>
            {sportTypes.map((sportType) => (
              <option key={sportType} value={sportType}>{sportType}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Home team</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.homeTeam} name="home_team" required />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Away team</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.awayTeam} name="away_team" required />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Start date/time</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={toDateTimeLocal(session.startTime)} name="start_time" required type="datetime-local" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">End date/time</span>
            <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.endTime ? toDateTimeLocal(session.endTime) : ""} name="end_time" type="datetime-local" />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">Status</span>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.status} name="status">
              <option value="scheduled">scheduled</option>
              <option value="active">active</option>
              <option value="final">final</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 border-t border-[var(--line)] pt-5">
          <label className="flex min-h-12 items-start gap-3 rounded-lg border border-[var(--line)] bg-white p-4">
            <input className="mt-1 h-5 w-5" defaultChecked={session.isDemo} name="is_demo" type="checkbox" />
            <span>
              <span className="block text-sm font-black">Demo session</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                Allows Scoreboard Demo Mode controls. Leave unchecked for real games.
              </span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Primary label</span>
              <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.primaryLinkLabel ?? ""} name="primary_link_label">
                <option value="">Select label</option>
                {linkLabels.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Primary URL</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.primaryLinkUrl ?? ""} name="primary_link_url" type="url" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Secondary label</span>
              <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.secondaryLinkLabel ?? ""} name="secondary_link_label">
                <option value="">Select label</option>
                {linkLabels.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Secondary URL</span>
              <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={session.secondaryLinkUrl ?? ""} name="secondary_link_url" type="url" />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Notes</span>
            <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={session.notes ?? ""} name="notes" />
          </label>
        </div>
        <div className="flex justify-end border-t border-[var(--line)] pt-5">
          <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
            Save session
          </button>
        </div>
      </form>
    </section>
  );
}
