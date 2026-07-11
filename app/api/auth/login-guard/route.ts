export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"
import { verifyTurnstileToken } from "@/lib/turnstile"

const MAX_ATTEMPTS = 5

/**
 * POST /api/auth/login-guard
 *
 * Called by the login form BEFORE attempting sign-in. After 5 failed
 * attempts for an email, this blocks the attempt until either the cooldown
 * passes or a valid Turnstile token is supplied (solving the CAPTCHA skips
 * the wait, per product decision).
 */
export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, captchaToken } = await req.json()
    const email = (rawEmail ?? "").trim().toLowerCase()
    if (!email) return NextResponse.json({ blocked: false })

    const admin = createAdminClient()
    const { data: row } = await admin
      .from("login_attempts")
      .select("failed_count, locked_until")
      .eq("email", email)
      .maybeSingle()

    const stillCoolingDown = !!row?.locked_until && new Date(row.locked_until) > new Date()
    const needsCaptcha = (row?.failed_count ?? 0) >= MAX_ATTEMPTS

    if (!needsCaptcha && !stillCoolingDown) {
      return NextResponse.json({ blocked: false })
    }

    // Solving the CAPTCHA lets them through immediately, cooldown or not.
    if (captchaToken) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      const valid = await verifyTurnstileToken(captchaToken, ip)
      if (valid) return NextResponse.json({ blocked: false })
      return NextResponse.json({ blocked: true, requiresCaptcha: true, error: "Captcha verification failed — please try again." })
    }

    const retryAfterSeconds = stillCoolingDown
      ? Math.max(0, Math.ceil((new Date(row!.locked_until!).getTime() - Date.now()) / 1000))
      : 0

    return NextResponse.json({ blocked: true, requiresCaptcha: true, retryAfterSeconds })
  } catch (err) {
    console.error("[LOGIN-GUARD] error:", err)
    // Fail open — a broken guard should never itself lock legitimate users out.
    return NextResponse.json({ blocked: false })
  }
}
