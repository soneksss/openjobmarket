import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"
import { verifyCronRequest } from "@/lib/cron-auth"

export async function GET(request: NextRequest) {
  const unauth = verifyCronRequest(request)
  if (unauth) return unauth

  try {
    const admin = createAdminClient()

    const now = new Date().toISOString()

    // 1. Expire open_for_business and urgent_notifications_enabled together.
    //    Clearing both fields here avoids relying on the RPC alone — if the RPC
    //    fails, urgent_notifications_enabled would stay true while open_for_business
    //    was already false, causing a split-brain mismatch.
    const { data, error } = await admin
      .from("company_profiles")
      .update({
        open_for_business:               false,
        availability_expires_at:         null,
        urgent_notifications_enabled:    false,
        urgent_notifications_expires_at: null,
      })
      .eq("open_for_business", true)
      .lt("availability_expires_at", now)
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
