import { getVenueWeatherOperation } from "@/lib/services/weather-operations";

const activeStatuses = new Set(["hold", "evacuating", "restart_countdown"]);

export async function WeatherOperationsStatusCard({ venueId }: { venueId: string }) {
  const state = await getVenueWeatherOperation(venueId).catch(() => null);
  if (!state || (!activeStatuses.has(state.status) && state.status !== "all_clear")) return null;
  const restart = state.restartNotBefore ? new Date(state.restartNotBefore) : null;
  const urgent = state.status === "hold" || state.status === "evacuating";
  return (
    <section aria-live="polite" className={`rounded-lg border-2 p-5 shadow-md ${urgent ? "border-red-500 bg-red-50 text-red-950" : state.status === "restart_countdown" ? "border-amber-400 bg-amber-50 text-amber-950" : "border-emerald-300 bg-emerald-50 text-emerald-950"}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em]">Venue weather operations</p>
      <h2 className="mt-2 text-2xl font-black">{state.status === "evacuating" ? "Evacuate fields" : state.status === "hold" ? "Play is on hold" : state.status === "restart_countdown" ? "Restart countdown" : "All clear"}</h2>
      <p className="mt-2 text-sm font-bold leading-6">{state.message}</p>
      {restart ? <p className="mt-3 text-lg font-black">Restart not before {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(restart)} — await staff direction</p> : null}
      <p className="mt-3 text-xs font-bold opacity-75">Updated {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(state.updatedAt))}</p>
    </section>
  );
}
