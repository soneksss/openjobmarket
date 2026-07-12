export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

/**
 * POST /api/auth/login-guard
 *
 * Called by the login form BEFORE attempting sign-in. After 5 failed
 * attempts for an email, blocks further attempts for a 2-minute cooldown
 * (set by /api/auth/login-record).
 */
export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = await req.json()
    const email = (rawEmail ?? "").trim().toLowerCase()
    if (!email) return NextResponse.json({ blocked: false })

    const admin = createAdminClient()
    const { data: row } = await admin
      .from("login_attempts")
      .select("locked_until")
      .eq("email", email)
      .maybeSingle()

    const stillCoolingDown = !!row?.locked_until && new Date(row.locked_until) > new Date()
    if (!stillCoolingDown) return NextResponse.json({ blocked: false })

    const retryAfterSeconds = Math.max(0, Math.ceil((new Date(row!.locked_until!).getTime() - Date.now()) / 1000))
    return NextResponse.json({ blocked: true, retryAfterSeconds })
  } catch (err) {
    console.error("[LOGIN-GUARD] error:", err)
    // Fail open — a broken guard should never itself lock legitimate users out.
    return NextResponse.json({ blocked: false })
  }
}
