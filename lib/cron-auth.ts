import { type NextRequest, NextResponse } from "next/server"

/**
 * Returns a 401 response if the request is not from an authorised cron caller.
 * Accepts either:
 *   - the `x-vercel-cron: 1` header injected automatically by Vercel Cron, OR
 *   - `Authorization: Bearer <CRON_SECRET_TOKEN>` for manual / dev invocations.
 *
 * Returns null when the request is authorised so callers can do:
 *   const unauth = verifyCronRequest(request)
 *   if (unauth) return unauth
 */
export function verifyCronRequest(request: NextRequest): NextResponse | null {
  const isVercelCron = request.headers.get("x-vercel-cron") === "1"
  if (isVercelCron) return null

  const token = process.env.CRON_SECRET_TOKEN ?? process.env.CRON_SECRET
  const auth  = request.headers.get("authorization")
  if (token && auth === `Bearer ${token}`) return null

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
