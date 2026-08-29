import "server-only";

import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type LimitRow = { blocked: boolean; retry_after: number };

export function durableLimitKey(scope: string, value: string) {
  return scope + ":" + createHash("sha256").update(value).digest("hex");
}

export async function checkDurableFailureLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number,
  recordFailure = false,
): Promise<{ blocked: boolean; retryAfter: number }> {
  try {
    const result = await getSupabaseAdminClient().rpc(
      "consume_public_failure_limit" as never,
      {
        p_bucket_key: bucketKey,
        p_limit: limit,
        p_window_seconds: windowSeconds,
        p_record_failure: recordFailure,
      } as never,
    ) as unknown as { data: LimitRow[] | LimitRow | null; error: { message: string } | null };
    if (result.error) throw new Error(result.error.message);
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) throw new Error("Rate limiter returned no result.");
    return { blocked: Boolean(row.blocked), retryAfter: Math.max(0, Number(row.retry_after) || 0) };
  } catch (error) {
    console.error("Durable public rate limit unavailable", error);
    return { blocked: true, retryAfter: 60 };
  }
}
