import "server-only";

import type { AccessContext } from "@/lib/access/capabilities";
import { isPilotPreviewEnvironment } from "@/lib/pilot-build";
import { sanitizePilotContext, type PilotEventContext, type PilotEventName } from "@/lib/pilot-telemetry-core";
import { logAudit } from "@/lib/services/identity";

export async function recordPilotEvent(ctx: AccessContext, eventName: PilotEventName, context: PilotEventContext = {}): Promise<void> {
  if (!isPilotPreviewEnvironment() || !ctx.venueId) return;
  try {
    const safe = sanitizePilotContext(context);
    await logAudit({
      action: eventName,
      actorUserId: null,
      metadata: {
        action_type: safe.actionType ?? null,
        duration_bucket: safe.durationBucket ?? null,
        outcome: safe.outcome ?? null,
        role: ctx.roleKey,
        source: safe.source ?? null,
        viewport: safe.viewport ?? null,
      },
      resourceType: "pilot_event",
      scopeId: ctx.venueId,
      scopeType: "venue",
    });
  } catch {
    console.warn("Pilot telemetry unavailable", { eventName });
  }
}
