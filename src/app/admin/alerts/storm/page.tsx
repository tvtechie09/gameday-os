import Link from "next/link";
import { revalidatePath } from "next/cache";
import { publicErrorMessage } from "@/lib/public-error";
import { assessStormRisk, executeStormResponse } from "@/lib/services/storm-watch";
import { getStormResponseModeLabel } from "@/lib/services/weather-profiles";
import { getSessionContext } from "@/lib/access/session";
import { managesAllVenues, venueInScope } from "@/lib/access/capabilities";
import { getVenue } from "@/lib/services/venues";

export const dynamic = "force-dynamic";

const RISK_STYLES: Record<string, { label: string; cls: string }> = {
  clear: { label: "CLEAR", cls: "bg-green-100 text-green-800" },
  caution: { label: "CAUTION", cls: "bg-amber-100 text-amber-900" },
  severe: { label: "SEVERE", cls: "bg-red-100 text-red-800" },
};

export default async function StormWatchPage() {
  let errorMessage: string | null = null;
  let assessment: Awaited<ReturnType<typeof assessStormRisk>> = null;
  try {
    assessment = await assessStormRisk();
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Storm watch is unavailable.");
  }

  async function respond(formData: FormData) {
    "use server";
    const venueId = String(formData.get("venueId") || "");
    const severity = String(formData.get("severity") || "caution");
    if (!venueId) return;
    // Capability reaches the storm page; scope decides which venue can be held.
    const ctx = await getSessionContext();
    if (!managesAllVenues(ctx)) {
      const venue = await getVenue(venueId);
      if (!venue || !venueInScope(ctx, venue)) return;
    }
    const current = await assessStormRisk(venueId);
    if (!current) return;
    await executeStormResponse(current, { severe: severity === "severe", source: "manual" });
    revalidatePath("/admin/alerts/storm");
    revalidatePath("/admin/alerts");
  }

  const risk = RISK_STYLES[assessment?.risk ?? "clear"];

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Announcements</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Storm watch</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Live weather turned into a game-day decision: detection is automatic, the response is your
        one tap — flag every field delayed and send the weather alert (followers and linked-team
        guardians included).
      </p>
      <p className="mt-2 text-sm">
        <Link className="font-bold text-[var(--accent-strong)] underline" href="/admin/alerts">Back to Announcements</Link>
      </p>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5"><p className="text-sm text-red-800">{errorMessage}</p></div>
      ) : !assessment ? (
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">No venue configured yet.</p></div>
      ) : (
        <div className="mt-8 grid gap-6">
          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black">{assessment.venueName}</h2>
              <span className={"rounded-md px-3 py-1 text-sm font-black " + risk.cls}>{risk.label}</span>
            </div>
            {assessment.weather ? (
              <p className="mt-3 text-sm leading-6">
                {assessment.weather.condition}
                {assessment.weather.temperatureF !== null ? " · " + Math.round(assessment.weather.temperatureF) + "°F" : ""}
                {assessment.weather.windMph !== null ? " · wind " + Math.round(assessment.weather.windMph) + " mph" : ""}
                {" · rain: " + (assessment.weather.rainStatus || "none")}
                {" · lightning: " + (assessment.weather.lightningStatus || "none")}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">{assessment.weatherError} You can still send a manual weather response below.</p>
            )}
            {assessment.reasons.length ? (
              <ul className="mt-2 list-disc pl-5 text-sm font-bold text-amber-900">
                {assessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            ) : null}
            <p className="mt-3 text-sm text-[var(--muted)]">
              {assessment.upcomingGames.length} game{assessment.upcomingGames.length === 1 ? "" : "s"} in the next 6 hours across {assessment.fieldCount} fields.
            </p>
            {assessment.profile ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                {getStormResponseModeLabel(assessment.profile.autoResponseMode)} · wind ≥ {assessment.profile.windThresholdMph} mph · rain: {assessment.profile.rainSensitivity === "any" ? "any" : "heavy only"}
                {assessment.profile.notifyUmpires ? " · texts umpires" : ""}
                {assessment.profile.autoResponseMode === "automatic" ? " — auto-suspends on severe" : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">No weather profile — set thresholds &amp; automation in <Link className="font-bold text-[var(--accent-strong)] underline" href="/admin/weather">Weather settings</Link>.</p>
            )}
            {assessment.upcomingGames.slice(0, 6).map((game) => (
              <p key={game.id} className="mt-1 text-sm">
                {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(game.startTime))} · {game.fieldName} — {game.label}
              </p>
            ))}
          </section>

          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-black">One-tap response</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              <span className="font-bold">Clear the fields</span> flags every field at {assessment.venueName} as
              delayed and sends an urgent public weather alert. <span className="font-bold">Advisory</span> sends
              the heads-up alert without touching field statuses.
            </p>
            <form action={respond} className="mt-4 flex flex-wrap gap-3">
              <input name="venueId" type="hidden" value={assessment.venueId} />
              <button className="min-h-12 rounded-lg bg-red-700 px-6 text-sm font-black text-white" name="severity" type="submit" value="severe">
                Clear the fields + alert
              </button>
              <button className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-6 text-sm font-black" name="severity" type="submit" value="caution">
                Send weather advisory
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
