/**
 * Sliding-window in-memory rate limiter.
 *
 * Runs on the Next.js Edge runtime (middleware.ts) where the global Map
 * persists across requests within a single edge worker instance.
 *
 * Limitations:
 *  - Not shared across multiple Vercel regions / worker instances.
 *    For strict multi-region enforcement, swap the Map for Upstash Redis.
 *  - Automatic eviction: entries with zero timestamps are deleted to prevent
 *    unbounded growth over time.
 *
 * Usage:
 *   const ok = rateLimit(`messages:${ip}`, 20, 60_000)  // 20 req / 60 s
 *   if (!ok) return new Response("Too Many Requests", { status: 429 })
 */

const store = new Map<string, number[]>()

/**
 * Returns true when the request is allowed, false when it should be blocked.
 *
 * @param key       Unique identifier — typically `"route:ip"` or `"route:userId"`
 * @param limit     Maximum requests allowed in the window
 * @param windowMs  Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const cutoff = now - windowMs

  const hits = (store.get(key) ?? []).filter(t => t > cutoff)

  if (hits.length >= limit) {
    store.set(key, hits)
    return false
  }

  hits.push(now)
  store.set(key, hits)
  return true
}
