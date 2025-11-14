import { type NextRequest, NextResponse } from "next/server"
import { processJobExpirations } from "@/lib/job-expiration"

// This API route can be called by external cron services like Vercel Cron or GitHub Actions
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from an authorized source (optional)
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
