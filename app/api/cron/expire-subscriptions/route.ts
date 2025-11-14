import { NextResponse } from "next/server"
import { expireOldSubscriptions } from "@/lib/subscription-lifecycle"

/**
 * API endpoint to expire old subscriptions
 * This can be called by a cron job or similar scheduled task
 */
export async function POST() {
  try {
    const result = await expireOldSubscriptions()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully expired ${result.expired_count} subscriptions`,
      expired_count: result.expired_count
    })
  } catch (error) {
    console.error("Error in expire-subscriptions cron:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "expire-subscriptions",
    description: "Expires subscriptions that have passed their end date"
  })
}