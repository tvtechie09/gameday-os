"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/access/session";
import { refreshDemoDay } from "@/lib/services/demo-day";

// Re-times the DEMO games onto today so the Command Center shows a live Saturday
// for a walkthrough. Only touches sessions flagged is_demo (see demo-day.ts) —
// a real venue's schedule can't be reached from here.
export async function refreshDemoDayAction(): Promise<void> {
  const ctx = await getSessionContext();
  await refreshDemoDay(ctx); // throws unless platform staff
  revalidatePath("/admin/command-center");
  revalidatePath("/today");
  revalidatePath("/admin/impact");
}
