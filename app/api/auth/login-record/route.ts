export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

const MAX_ATTEMPTS = 5
const COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes

/**
 * POST /api/auth/login-record
 *
 * Called by the login form immediately after a sign-in attempt resolves.
 * Successful sign-in clears the email's history; a failure increments the
 * count and, at 5, starts the cooldown enforced by /api/auth/login-guard.
 */
export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, success } = await req.json()
    const email = (rawEmail ?? "").trim().toLowerCase()
    if (!email) return NextResponse.json({ ok: true })

    const admin = createAdminClient()

    if (success) {
      await admin.from("login_attempts").delete().eq("email", email)
      return NextResponse.json({ ok: true })
    }

    const { data: row } = await admin
      .from("login_attempts")
      .select("failed_count")
      .eq("email", email)
      .maybeSingle()

    const hitLimit = (row?.failed_count ?? 0) + 1 >= MAX_ATTEMPTS
    // Reset the counter once a cooldown starts, so the next cycle also gets a full 5 attempts.
    const nextCount = hitLimit ? 0 : (row?.failed_count ?? 0) + 1
    const locked_until = hitLimit ? new Date(Date.now() + COOLDOWN_MS).toISOString() : null

    await admin
      .from("login_attempts")
      .upsert(
        { email, failed_count: nextCount, locked_until, updated_at: new Date().toISOString() },
        { onConflict: "email" }
      )

    return NextResponse.json({ ok: true, lockedOut: hitLimit, retryAfterSeconds: hitLimit ? COOLDOWN_MS / 1000 : 0 })
  } catch (err) {
    console.error("[LOGIN-RECORD] error:", err)
    return NextResponse.json({ ok: false })
  }
}
