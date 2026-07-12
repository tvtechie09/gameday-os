"use server";

import { createClient } from "@supabase/supabase-js";
import { resolveSession } from "@/lib/access/session";
import { publicErrorMessage } from "@/lib/public-error";

const ROLES = new Set(["parent", "coach", "team-manager", "organization", "venue", "tournament", "other"]);
const CATEGORIES = new Set(["concern", "complaint", "feedback", "idea"]);

export type FeedbackResult = { ok?: boolean; error?: string };

export async function submitFeedbackAction(formData: FormData): Promise<FeedbackResult> {
  try {
    const session = await resolveSession();
    if (session.kind !== "active") return { error: "Sign in again to send feedback." };
    const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
    if (message.length < 5) return { error: "Tell us a little more — a few words at least." };
    const roleTypeRaw = String(formData.get("role_type") ?? "venue");
    const categoryRaw = String(formData.get("category") ?? "feedback");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { error: "Feedback is unavailable in this environment." };
    const supabase = createClient(url, key);
    const ctx = session.context;
    const { error } = await supabase.from("gameday_feedback").insert({
      app: "venue",
      person_name: ctx?.displayName || "",
      person_email: ctx?.email || "",
      role_type: ROLES.has(roleTypeRaw) ? roleTypeRaw : "venue",
      category: CATEGORIES.has(categoryRaw) ? categoryRaw : "feedback",
      message,
      actor_id: ctx?.userId || ""
    });
    if (error) return { error: "Could not save your feedback. Try again." };
    return { ok: true };
  } catch (error) {
    return { error: publicErrorMessage(error, "Could not send feedback.") };
  }
}
