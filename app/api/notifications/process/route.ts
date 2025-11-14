import { type NextRequest, NextResponse } from "next/server"
import { processNotificationQueue } from "@/lib/email-service"
import { createClient } from "@/lib/server"

// Force Node.js runtime to ensure process.env works correctly
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log("[NOTIFICATIONS] Starting GET request...")

    // Verify the request is from an authorized source
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.log("[NOTIFICATIONS] Unauthorized request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[NOTIFICATIONS] Processing notification queue...")

    const result = await processNotificationQueue()

    console.log("[NOTIFICATIONS] Queue processing complete:", result)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error("[NOTIFICATIONS] Error processing queue:", {
      message: error?.message,
      stack: error?.stack,
      error: error
    })
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error?.message || "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[NOTIFICATIONS] Starting POST request...")

    const body = await request.json()
    console.log("[NOTIFICATIONS] Request body:", body)

    const { action } = body

    if (action === "queue_expiration_notifications") {
      console.log("[NOTIFICATIONS] Queueing expiration notifications...")

      const supabase = await createClient()

      const { data, error } = await supabase.rpc("queue_job_expiration_notifications")

      if (error) {
        console.error("[NOTIFICATIONS] Supabase RPC error:", error)
        throw error
      }

      console.log("[NOTIFICATIONS] Successfully queued notifications:", data)

      return NextResponse.json({
        success: true,
        queued_notifications: data,
      })
    }

    console.log("[NOTIFICATIONS] Invalid action:", action)
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[NOTIFICATIONS] Error in POST:", {
      message: error?.message,
      stack: error?.stack,
      error: error
    })
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error?.message || "Unknown error"
    }, { status: 500 })
  }
}
