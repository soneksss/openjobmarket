import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

// ── Rate limit rules ──────────────────────────────────────────────────────────
//
// Applied only to POST requests (mutations). GET requests are read-only
// and do not need rate limiting here (database-level protections apply).
//
// Key is scoped per IP so that bot farms cycling through accounts are still
// blocked.  Authenticated user ID could be added for stricter per-account
// limits, but parsing the auth cookie in Edge middleware is expensive.
//
// Limits (per IP):
//   /api/messages              — 20 messages / 60 s   (spam / unsolicited contact)
//   /api/jobs  (exact)         — 5  jobs     / 5 min  (fake job listings)
//   /api/jobs/*/dispatch-*     — 3  dispatches / 60 s (urgent job spam)

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

function rateLimitRoute(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip = getIp(req)
  const allowed = rateLimit(`${bucket}:${ip}`, limit, windowMs)
  if (allowed) return null

  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: {
      "Retry-After": String(Math.ceil(windowMs / 1000)),
      "Content-Type": "text/plain",
    },
  })
}

export function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next()

  const { pathname } = req.nextUrl

  // 1. Messages (also creates job applications on first contact)
  if (pathname === "/api/messages") {
    return rateLimitRoute(req, "messages", 20, 60_000) ?? NextResponse.next()
  }

  // 2. Job creation
  if (pathname === "/api/jobs") {
    return rateLimitRoute(req, "jobs-create", 5, 300_000) ?? NextResponse.next()
  }

  // 3. Urgent / flexible dispatch  — /api/jobs/:id/dispatch-urgent|flexible
  if (/^\/api\/jobs\/[^/]+\/dispatch-(urgent|flexible)$/.test(pathname)) {
    return rateLimitRoute(req, "jobs-dispatch", 3, 60_000) ?? NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  // Only run middleware on these paths — keeps all other routes unaffected
  matcher: [
    "/api/messages",
    "/api/jobs",
    "/api/jobs/:id/dispatch-urgent",
    "/api/jobs/:id/dispatch-flexible",
  ],
}
