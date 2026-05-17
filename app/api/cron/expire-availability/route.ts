import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"
import { verifyCronRequest } from "@/lib/cron-auth"

export async function GET(request: NextRequest) {
  const unauth = verifyCronRequest(request)
  if (unauth) return unauth

  try {
    const admin = createAdminClient()

    // 1. Expire legacy open_for_business field
    const { data, error } = await admin
      .from("company_profiles")
      .update({ open_for_business: false })
      .eq("open_for_business", true)
      .lt("availability_expires_at", new Date().toISOString())
      .select("user_id")

    if (error) {
      console.error("[CRON expire-availability]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 2. Expire urgent_notifications_enabled via DB function (single source of truth)
    const { data: urgentExpired, error: urgentErr } = await admin
      .rpc("expire_urgent_notifications")

    if (urgentErr) {
      console.error("[CRON expire-availability] expire_urgent_notifications:", urgentErr.message)
    }

    const legacyExpired = data?.length ?? 0
    const urgentExpiredCount = urgentExpired ?? 0
    console.log(`[CRON expire-availability] legacy=${legacyExpired} urgent=${urgentExpiredCount}`)
    return NextResponse.json({ success: true, expired: legacyExpired, urgentExpired: urgentExpiredCount })
  } catch (err) {
    console.error("[CRON expire-availability]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
