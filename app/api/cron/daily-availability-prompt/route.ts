import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"
import { sendWebPushToUser } from "@/lib/web-push"

// Rough bounding box for ~10 miles (0.145° ≈ 10 miles at UK latitudes)
const NEARBY_DEGREES = 0.145

async function hasJobsNearby(admin: ReturnType<typeof createAdminClient>, lat: number, lon: number): Promise<boolean> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString())
    .eq("status", "open")
    .gte("latitude", lat - NEARBY_DEGREES)
    .lte("latitude", lat + NEARBY_DEGREES)
    .gte("longitude", lon - NEARBY_DEGREES)
    .lte("longitude", lon + NEARBY_DEGREES)

  return (count ?? 0) > 0
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedToken = process.env.CRON_SECRET_TOKEN
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // Traders whose availability expired and haven't confirmed recently
    const { data: traders, error } = await admin
      .from("company_profiles")
      .select("user_id, latitude, longitude")
      .eq("open_for_business", false)
      .not("availability_expires_at", "is", null)
      .lt("availability_expires_at", new Date().toISOString())
      .or(`last_availability_confirmed_at.is.null,last_availability_confirmed_at.lt.${new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()}`)

    if (error) {
      console.error("[CRON daily-availability-prompt]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!traders?.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    let sent = 0
    const staleTokens: string[] = []

    for (const trader of traders) {
      const { data: tokenRows } = await admin
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", trader.user_id)

      if (!tokenRows?.length) continue

      // Check for nearby jobs posted today to personalise the message
      const jobsNearby =
        trader.latitude != null && trader.longitude != null
          ? await hasJobsNearby(admin, trader.latitude, trader.longitude)
          : false

      const title = jobsNearby
        ? "🔔 New jobs posted near you today. Are you available?"
        : "Are you available for jobs today?"

      const tokens = tokenRows.map((r: any) => r.token)
      const result = await sendWebPushToUser(tokens, {
        title,
        body: "Tap Yes to go back on the map and receive job notifications.",
        url: "/confirm-availability",
        tag: "availability-prompt",
        requireInteraction: true,
        actions: [
          { action: "confirm", title: "✔ Yes" },
          { action: "decline", title: "✖ Not today" },
        ],
      } as any)

      sent += result.sent
      staleTokens.push(...result.expired)
    }

    // Clean up expired push tokens
    if (staleTokens.length) {
      await admin.from("user_push_tokens").delete().in("token", staleTokens)
    }

    console.log(`[CRON daily-availability-prompt] Sent ${sent} notifications`)
    return NextResponse.json({ success: true, sent })
  } catch (err) {
    console.error("[CRON daily-availability-prompt]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
