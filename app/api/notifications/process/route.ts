import { type NextRequest, NextResponse } from "next/server"
import { processNotificationQueue } from "@/lib/email-service"
import { createClient } from "@/lib/server"

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[NOTIFICATIONS] Processing notification queue...")

    const result = await processNotificationQueue()

    console.log("[NOTIFICATIONS] Queue processing complete:", result)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[NOTIFICATIONS] Error processing queue:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === "queue_expiration_notifications") {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc("queue_job_expiration_notifications")

      if (error) throw error

      return NextResponse.json({
        success: true,
        queued_notifications: data,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[NOTIFICATIONS] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
