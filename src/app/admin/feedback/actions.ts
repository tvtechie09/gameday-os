"use server";

import { createClient } from "@supabase/supabase-js";
import { resolveSession } from "@/lib/access/session";
import { publicErrorMessage } from "@/lib/public-error";

const FEEDBACK_TYPES = new Set(["confusing", "bug", "suggestion"]);
const PILOT_SCREENS = new Set(["Home", "Today", "Fields", "Schedule", "Work Orders", "Venue Status", "Announcements", "Other"]);
const CATEGORY_BY_TYPE = { confusing: "feedback", bug: "concern", suggestion: "idea" } as const;

export type FeedbackResult = { ok?: boolean; error?: string };

export async function submitFeedbackAction(formData: FormData): Promise<FeedbackResult> {
  try {
    const session = await resolveSession();
    if (session.kind !== "active") return { error: "Sign in again to send feedback." };
    const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
    if (message.length < 5) return { error: "Tell us a little more — a few words at least." };
    const feedbackTypeRaw = String(formData.get("feedback_type") ?? "confusing");
    const feedbackType = FEEDBACK_TYPES.has(feedbackTypeRaw) ? feedbackTypeRaw as keyof typeof CATEGORY_BY_TYPE : "confusing";
    const screenRaw = String(formData.get("screen") ?? "");
    const screen = PILOT_SCREENS.has(screenRaw) ? screenRaw : "Not specified";
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { error: "Feedback is unavailable in this environment." };
    const supabase = createClient(url, key);
    const role = session.context.roleKey === "venue_staff" ? "venue_staff" : "venue_gm";
    const { error } = await supabase.from("gameday_feedback").insert({
      app: "venue",
      person_name: "",
      person_email: "",
      role_type: "venue",
      category: CATEGORY_BY_TYPE[feedbackType],
      message: `[Pilot ${feedbackType}; screen: ${screen}; role: ${role}]\n\n${message}`,
      actor_id: ""
    });
    if (error) return { error: "Could not save your feedback. Try again." };
    return { ok: true };
  } catch (error) {
    return { error: publicErrorMessage(error, "Could not send feedback.") };
  }
}
