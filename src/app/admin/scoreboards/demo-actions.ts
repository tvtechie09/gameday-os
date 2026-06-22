"use server";

import { revalidatePath } from "next/cache";
import { applyDemoScoreboardAction, type DemoScoreboardAction } from "@/lib/services/session-demo";
import { getSession } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";

export type DemoScoreboardActionResult = {
  error?: string;
  session?: Session;
};

const validActions: DemoScoreboardAction[] = ["start", "home_plus_one", "away_plus_one", "next_period", "reset"];

export async function runDemoScoreboardAction(sessionId: string, action: DemoScoreboardAction): Promise<DemoScoreboardActionResult> {
  if (!validActions.includes(action)) {
    return { error: "Choose a valid demo scoreboard action." };
  }

  try {
    const session = await getSession(sessionId);

    if (!session) {
      return { error: "Session not found." };
    }

    const updatedSession = await applyDemoScoreboardAction(session, action);

    revalidatePath(`/admin/sessions/${sessionId}`);
    revalidatePath(`/fields/${updatedSession.fieldId}`);
    revalidatePath(`/scoreboard/${sessionId}`);
    revalidatePath(`/scoreboard/field/${updatedSession.fieldId}`);

    return { session: updatedSession };
  } catch (error) {
    console.error("Failed to run demo scoreboard action", error);
    return {
      error: error instanceof Error ? error.message : "Unable to run demo scoreboard action.",
    };
  }
}
