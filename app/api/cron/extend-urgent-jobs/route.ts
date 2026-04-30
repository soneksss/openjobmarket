import { createAdminClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"

/**
 * GET/POST /api/cron/extend-urgent-jobs
 *
 * Runs periodically (recommended: every 15 minutes via Vercel Cron).
 * Finds urgent jobs (asap/today) that have just expired with 0 applications
 * and extends them by 24 hours so tradespeople still have a chance to apply.
 *
 * Also notifies the homeowner that the job has been kept visible.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedToken = process.env.CRON_SECRET_TOKEN
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const now = new Date()

    // Find urgent jobs that expired in the last 2 hours with zero applications
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const { data: expiredJobs, error: fetchError } = await admin
      .from("jobs")
      .select("id, title, homeowner_id, company_id, urgency_type, expires_at, applications_count")
      .in("urgency_type", ["asap", "today"])
      .lte("expires_at", now.toISOString())
      .gte("expires_at", twoHoursAgo)       // only jobs that JUST expired (not old ones)
      .eq("is_active", true)                  // still marked active (expiry not yet processed)
      .eq("status", "POSTED")
      .or("applications_count.is.null,applications_count.eq.0")

    if (fetchError) {
      console.error("[EXTEND-URGENT] Error fetching expired jobs:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!expiredJobs || expiredJobs.length === 0) {
      return NextResponse.json({ success: true, extended: 0, message: "No qualifying jobs found" })
    }

    console.log(`[EXTEND-URGENT] Found ${expiredJobs.length} urgent job(s) to extend`)

    const extended24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    let extendedCount = 0
    let notifiedCount = 0

    for (const job of expiredJobs) {
      try {
        // Extend the job by 24 hours
        const { error: updateError } = await admin
          .from("jobs")
          .update({
            expires_at: extended24h,
            // Keep is_active = true, status = POSTED — the job stays open
          })
          .eq("id", job.id)

        if (updateError) {
          console.error(`[EXTEND-URGENT] Failed to extend job ${job.id}:`, updateError.message)
          continue
        }

        extendedCount++
        console.log(`[EXTEND-URGENT] Extended job ${job.id} (${job.title}) by 24h`)

        // Notify the homeowner (or company if they posted it)
        const posterUserId = job.homeowner_id
          ? await getHomeownerUserId(admin, job.homeowner_id)
          : await getCompanyUserId(admin, job.company_id)

        if (posterUserId) {
          const { error: notifError } = await admin.from("notifications").insert({
            user_id: posterUserId,
            type: "job_extended",
            title: "Your job is still visible",
            message: `No one applied to "${job.title}" yet, so we've kept it visible for another 24 hours in case a tradesperson becomes available. You can cancel the job anytime from your dashboard.`,
            link_url: `/dashboard/homeowner`,
            is_read: false,
          })

          if (!notifError) notifiedCount++
        }
      } catch (err) {
        console.error(`[EXTEND-URGENT] Error processing job ${job.id}:`, err)
      }
    }

    console.log(`[EXTEND-URGENT] Complete: extended=${extendedCount} notified=${notifiedCount}`)
    return NextResponse.json({ success: true, extended: extendedCount, notified: notifiedCount })
  } catch (error) {
    console.error("[EXTEND-URGENT] Fatal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getHomeownerUserId(admin: ReturnType<typeof createAdminClient>, homeownerId: string) {
  const { data } = await admin
    .from("homeowner_profiles")
    .select("user_id")
    .eq("id", homeownerId)
    .maybeSingle()
  return data?.user_id ?? null
}

async function getCompanyUserId(admin: ReturnType<typeof createAdminClient>, companyId: string | null) {
  if (!companyId) return null
  const { data } = await admin
    .from("company_profiles")
    .select("user_id")
    .eq("id", companyId)
    .maybeSingle()
  return data?.user_id ?? null
}
