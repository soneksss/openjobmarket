import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

/**
 * GET /api/referral-config
 *
 * Public — no auth required. Lets marketing pages (e.g. /for-tradespeople)
 * know whether the referral programme is currently issuing rewards, so the
 * invite card can show "coming soon" instead of implying a reward that
 * won't actually be granted.
 */
export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("admin_settings")
      .select("referral_program_enabled")
      .eq("id", 1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ enabled: true })
    }

    return NextResponse.json({ enabled: data?.referral_program_enabled ?? true })
  } catch {
    return NextResponse.json({ enabled: true })
  }
}
