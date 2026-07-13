// Lightweight in-process rate limiter for unauthenticated public endpoints
// (scorekeeper PIN, follows). Sliding fixed-window keyed by IP and/or the
// resource token. Memory is per serverless instance — a first line of defense
// against a single-source flood, not a global quota. For the scorekeeper PIN
// (only 10k combinations) this is what makes brute-force impractical.

type Bucket = { count: number; limit: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

function prune(now: number) {
  if (buckets.size <= 5000) return;
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }
}

// One-shot limiter: counts every call. Good for endpoints where every request
// is equal (e.g. public registration spam).
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, limit, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= bucket.limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

// Failure-only limiter: check without incrementing, then record failures
// explicitly. Lets legitimate high-frequency success traffic through (e.g. a
// scorekeeper tapping the score pad) while throttling wrong-PIN attempts.
export function isBlocked(key: string): { blocked: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt > now && bucket.count >= bucket.limit) {
    return { blocked: true, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { blocked: false, retryAfter: 0 };
}

export function recordFailure(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, limit, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
}
