import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"
import { sendWebPushToUser } from "@/lib/web-push"
import { verifyCronRequest } from "@/lib/cron-auth"

export async function GET(request: NextRequest) {
  const unauth = verifyCronRequest(request)
  if (unauth) return unauth

  try {
    const admin = createAdminClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Inactive traders who haven't been prompted in the last 7 days
    // Excludes traders who manually turned off (availability_expires_at IS NULL) — wait, spec says
    // weekly reminder targets traders who are simply inactive, regardless of how they went offline.
    const { data: traders, error } = await admin
      .from("company_profiles")
      .select("user_id")
      .eq("open_for_business", false)
      .or(`last_availability_prompt_at.is.null,last_availability_prompt_at.lt.${sevenDaysAgo}`)

    if (error) {
      console.error("[CRON weekly-availability-reminder]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!traders?.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    let sent = 0
    const staleTokens: string[] = []
    const promptedUserIds: string[] = []

    for (const trader of traders) {
      const { data: tokenRows } = await admin
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", trader.user_id)

      if (!tokenRows?.length) continue

      const tokens = tokenRows.map((r: any) => r.token)
      const result = await sendWebPushToUser(tokens, {
        title: "Are you available for work this week?",
        body: "Turn on availability to receive local job notifications.",
        url: "/dashboard/company",
        tag: "weekly-availability-reminder",
      })

      if (result.sent > 0) {
        sent += result.sent
        promptedUserIds.push(trader.user_id)
      }
      staleTokens.push(...result.expired)
    }

    // Update last_availability_prompt_at for everyone we successfully notified
    if (promptedUserIds.length) {
      await admin
        .from("company_profiles")
        .update({ last_availability_prompt_at: new Date().toISOString() })
        .in("user_id", promptedUserIds)
    }

    // Clean up expired push tokens
    if (staleTokens.length) {
      await admin.from("user_push_tokens").delete().in("token", staleTokens)
    }

    console.log(`[CRON weekly-availability-reminder] Sent ${sent} notifications`)
    return NextResponse.json({ success: true, sent })
  } catch (err) {
    console.error("[CRON weekly-availability-reminder]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
