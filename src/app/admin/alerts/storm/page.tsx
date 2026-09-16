import Link from "next/link";
import { revalidatePath } from "next/cache";
import { publicErrorMessage } from "@/lib/public-error";
import { assessStormRisk, executeStormResponse } from "@/lib/services/storm-watch";
import { getStormResponseModeLabel } from "@/lib/services/weather-profiles";
import { getSessionContext } from "@/lib/access/session";
import { managesAllVenues, venueInScope } from "@/lib/access/capabilities";
import { getVenue } from "@/lib/services/venues";
import { getFields, updateFieldStatus } from "@/lib/services/fields";
import { createAlert } from "@/lib/services/alerts";
import { getVenueWeatherOperation, setVenueWeatherOperation, type VenueWeatherOperationStatus } from "@/lib/services/weather-operations";

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
  const operationState = assessment ? await getVenueWeatherOperation(assessment.venueId).catch(() => null) : null;

  async function authorizeVenue(venueId: string) {
    "use server";
    const ctx = await getSessionContext();
    if (!ctx?.userId) return null;
    if (!managesAllVenues(ctx)) {
      const venue = await getVenue(venueId);
      if (!venue || !venueInScope(ctx, venue)) return null;
    }
    return ctx;
  }

  async function respond(formData: FormData) {
    "use server";
    const venueId = String(formData.get("venueId") || "");
    const severity = String(formData.get("severity") || "caution");
    if (!venueId) return;
    // Capability reaches the storm page; scope decides which venue can be held.
    const ctx = await authorizeVenue(venueId);
    if (!ctx) return;
    const current = await assessStormRisk(venueId);
    if (!current) return;
    // A human clicked this, so the field holds attribute to them -- not to the
    // automation account. The scope check above already proved they may act here.
    await executeStormResponse(current, { severe: severity === "severe", source: "manual", actorUserId: ctx.userId });
    revalidatePath("/admin/alerts/storm");
    revalidatePath("/admin/alerts");
  }

  async function updateWeatherOperation(formData: FormData) {
    "use server";
    const venueId = String(formData.get("venueId") || "");
    const action = String(formData.get("weatherAction") || "monitoring") as VenueWeatherOperationStatus;
    if (!venueId) return;
    const ctx = await authorizeVenue(venueId);
    if (!ctx) return;
    const fields = (await getFields()).filter((field) => field.venueId === venueId);
    const fieldIds = fields.map((field) => field.id);
    const restartNotBefore = action === "restart_countdown" ? new Date(Date.now() + 30 * 60_000).toISOString() : null;
    const messages: Record<VenueWeatherOperationStatus, string> = {
      normal: "Normal weather operations.",
      monitoring: "Weather is being monitored. Be ready for a possible delay.",
      hold: "Play is paused. Leave playing areas and wait for venue staff instructions.",
      evacuating: "Evacuate all playing areas now and follow venue staff to designated shelter.",
      restart_countdown: "Conditions are improving. Play may resume after the safety countdown and staff inspection.",
      all_clear: "All clear. Fields may reopen when venue staff directs.",
    };
    if (action === "hold" || action === "evacuating") await Promise.all(fields.map((field) => updateFieldStatus(field.id, "delayed", ctx.userId)));
    if (action === "all_clear" || action === "normal") await Promise.all(fields.map((field) => updateFieldStatus(field.id, "open", ctx.userId)));
    await setVenueWeatherOperation({ venueId, status: action, message: messages[action], affectedFieldIds: action === "all_clear" || action === "normal" ? [] : fieldIds, restartNotBefore, acknowledge: true }, ctx.userId);
    await createAlert({
      venue_id: venueId,
      alert_type: "weather",
      alert_scope: "venue",
      alert_priority: action === "evacuating" ? "urgent" : action === "hold" ? "high" : "normal",
      alert_visibility: "public",
      title: action === "evacuating" ? "Evacuate Fields" : action === "restart_countdown" ? "Weather Restart Countdown" : action === "all_clear" ? "All Clear" : "Weather Operations Update",
      message: messages[action],
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      is_active: action !== "normal",
    });
    revalidatePath("/admin/alerts/storm");
    revalidatePath("/today");
    revalidatePath("/admin/fields");
    revalidatePath("/venues/[venueId]", "page");
    revalidatePath("/fields/[fieldId]", "page");
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Weather operations state</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">One shared state feeds staff, public venue pages, and every field QR page.</p>
              </div>
              <span className="rounded-md bg-[var(--background)] px-3 py-2 text-xs font-black uppercase">{operationState?.status.replaceAll("_", " ") ?? "normal"}</span>
            </div>
            {operationState?.message ? <p className="mt-3 rounded-lg bg-[var(--background)] p-3 text-sm font-bold">{operationState.message}</p> : null}
            <form action={updateWeatherOperation} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input name="venueId" type="hidden" value={assessment.venueId} />
              <button className="min-h-12 rounded-lg bg-red-700 px-3 text-xs font-black text-white" name="weatherAction" type="submit" value="evacuating">Evacuate</button>
              <button className="min-h-12 rounded-lg bg-amber-500 px-3 text-xs font-black text-white" name="weatherAction" type="submit" value="hold">Hold play</button>
              <button className="min-h-12 rounded-lg border border-[var(--line)] px-3 text-xs font-black" name="weatherAction" type="submit" value="restart_countdown">Start 30m countdown</button>
              <button className="min-h-12 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white" name="weatherAction" type="submit" value="all_clear">All clear</button>
            </form>
            <p className="mt-3 text-xs font-semibold text-[var(--muted)]">{operationState?.acknowledgedAt ? `Acknowledged ${new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(operationState.acknowledgedAt))}` : "Not yet acknowledged"}</p>
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
