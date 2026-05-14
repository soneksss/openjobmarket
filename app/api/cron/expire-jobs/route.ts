import { type NextRequest, NextResponse } from "next/server"
import { processJobExpirations } from "@/lib/job-expiration"
import { verifyCronRequest } from "@/lib/cron-auth"

export async function GET(request: NextRequest) {
  const unauth = verifyCronRequest(request)
  if (unauth) return unauth

  try {

    console.log("[CRON] Starting job expiration process...")

    const result = await processJobExpirations()

    if (!result) {
      console.error("[CRON] Failed to process job expirations")
      return NextResponse.json({ error: "Failed to process expirations" }, { status: 500 })
    }

    console.log(`[CRON] Job expiration complete:`, {
      expired: result.expired_count,
      expiring: result.expiring_jobs.length,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[CRON] Error in job expiration cron:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Allow POST as well for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
