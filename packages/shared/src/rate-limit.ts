/**
 * In-memory sliding-window rate limiter. Deliberately simple for a single-instance
 * phase-1 deployment (see docs/PRODUCT_SPEC.md's Redis decision) — protects
 * authentication, invitations, password reset, search, and upload-init endpoints from
 * brute-force/abuse per docs/SECURITY.md. If the app scales horizontally, swap the
 * `store` for a Redis-backed one behind this same `checkRateLimit` signature; callers
 * don't change.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Bound memory growth: drop expired buckets opportunistically.
function sweep(now: number) {
  if (store.size < 10_000) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.max - 1, resetAt };
  }

  if (existing.count >= options.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: options.max - existing.count, resetAt: existing.resetAt };
}

/** Test-only: clear all buckets between test cases. */
export function __resetRateLimitStoreForTests() {
  store.clear();
}
