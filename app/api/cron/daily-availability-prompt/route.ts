import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"
import { sendWebPushToUser } from "@/lib/web-push"
import { verifyCronRequest } from "@/lib/cron-auth"

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
  const unauth = verifyCronRequest(request)
  if (unauth) return unauth

  try {
    const admin = createAdminClient()

    // Traders whose availability expired and haven't been prompted in 12h
    const { data: traders, error } = await admin
      .rpc("get_traders_for_availability_prompt") as { data: { user_id: string; company_id: string; latitude: number | null; longitude: number | null }[] | null; error: any }

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
      })

      sent += result.sent
      staleTokens.push(...result.expired)

      // Record that we prompted this trader so we don't spam them
      if (result.sent > 0) {
        await admin.rpc("mark_availability_prompt_sent", { p_company_id: trader.company_id })
      }
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
