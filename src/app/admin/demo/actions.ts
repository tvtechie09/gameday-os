"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { prepareReferenceDemoTenant } from "@/lib/services/client-readiness";
import { refreshDemoDay } from "@/lib/services/demo-day";

function clean(value: FormDataEntryValue | null) { return String(value ?? "").trim().slice(0, 128); }
function demoUrl(message?: string, error?: string) { const query = new URLSearchParams(); if (message) query.set("message", message); if (error) query.set("error", error); return `/admin/demo${query.size > 0 ? `?${query}` : ""}`; }
function refreshDemoPaths() { revalidatePath("/admin/demo"); revalidatePath("/admin/command-center"); revalidatePath("/admin/impact"); revalidatePath("/admin/sponsors/campaigns"); }

export async function prepareReferenceDemoAction(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  let result;
  try {
    result = await prepareReferenceDemoTenant({ ctx, organizationId: clean(formData.get("organization_id")), venueId: clean(formData.get("venue_id")) });
  } catch (error) { redirect(demoUrl(undefined, error instanceof Error ? error.message : "Could not prepare the reference demo.")); }
  refreshDemoPaths();
  redirect(demoUrl(`Reference demo prepared: ${result.gamesReady} games, weather ${result.weatherReady ? "ready" : "needs attention"}, sponsor ${result.sponsorReady ? "ready" : "needs attention"}.`));
}

export async function refreshReferenceDemoAction(): Promise<void> {
  const ctx = await getSessionContext();
  let result;
  try {
    result = await refreshDemoDay(ctx);
  } catch (error) { redirect(demoUrl(undefined, error instanceof Error ? error.message : "Could not refresh the demo day.")); }
  refreshDemoPaths();
  redirect(demoUrl(`Demo day refreshed: ${result.updated} games, ${result.live} live, ${result.behind} behind.`));
}
