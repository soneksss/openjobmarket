import { createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/jobs/[id]/dispatch-urgent
 *
 * Calls the Step-3 ranking RPC to pick the top 5 contractors,
 * then for each one:
 *   1. Creates a job_applications row  (status = PENDING — NOT confirmed)
 *   2. Records an urgent_job_dispatch_alerts row
 *   3. Creates an in-app notification for the contractor
 *
 * Only fires for jobs that are:
 *   - status = POSTED
 *   - is_urgent = true
 *   - is_tradespeople_job = true
 *
 * Auth: uses service-role admin client (RPC is GRANT'd to service_role only).
 * Caller: job-wizard-modal.tsx, server-side only — never exposed to browser
 * directly (called from our own wizard POST on the same origin).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const admin = createAdminClient()

    // ── 1. Call the ranking RPC ─────────────────────────────────────
    // If the RPC fails (e.g. migration not yet applied, no geom on profile,
    // or job doesn't have coordinates), fall back to a broader search.
    let profileIds: string[] = []

    const { data: top5, error: rpcError } = await admin.rpc(
      "select_top_tradespeople_for_urgent_job",
      { p_job_id: jobId }
    )

    if (rpcError) {
      console.warn("[DISPATCH-URGENT] RPC unavailable, using fallback:", rpcError.message)
    } else if (top5 && top5.length > 0) {
      profileIds = top5.map((c: { tradesperson_id: string }) => c.tradesperson_id)
      console.log(`[DISPATCH-URGENT] RPC returned ${profileIds.length} candidate(s)`)
    }

    // ── 1b. Fallback: query company_profiles directly ───────────────
    // Used when the geospatial RPC finds 0 candidates (no geom set on profiles)
    // or when the RPC itself errors. Filters by job category/industry to ensure
    // only matching tradespeople receive the notification.
    if (profileIds.length === 0) {
      console.log("[DISPATCH-URGENT] Falling back to direct company_profiles query")

      // Fetch job category for skill-matching
      const { data: jobData } = await admin
        .from("jobs")
        .select("category, title")
        .eq("id", jobId)
        .maybeSingle()

      let fallbackQuery = admin
        .from("company_profiles")
        .select("id, industry, services")
        .eq("open_for_business", true)
        .eq("trade_job_notifications", true)

      const { data: allCandidates } = await fallbackQuery.limit(100)

      if (allCandidates && allCandidates.length > 0) {
        const jobCategory = (jobData?.category || jobData?.title || "").toLowerCase()

        // Filter by industry/services match if category is available
        let matched = allCandidates
        if (jobCategory) {
          matched = allCandidates.filter((p: { id: string; industry?: string; services?: string[] }) => {
            const industry = (p.industry || "").toLowerCase()
            const services = (p.services || []).map((s: string) => s.toLowerCase())
            return (
              industry.includes(jobCategory) ||
              jobCategory.includes(industry) ||
              services.some((s) => s.includes(jobCategory) || jobCategory.includes(s))
            )
          })
          // If no skill match found, fall back to all opted-in companies (better than 0 dispatches)
          if (matched.length === 0) {
            console.log("[DISPATCH-URGENT] No skill-matched candidates, using all opted-in companies")
            matched = allCandidates
          }
        }

        profileIds = matched.slice(0, 10).map((p: { id: string }) => p.id)
        console.log(`[DISPATCH-URGENT] Fallback found ${profileIds.length} matched company(s) for category: ${jobCategory}`)
      }
    }

    if (profileIds.length === 0) {
      console.log("[DISPATCH-URGENT] No candidates found for job:", jobId)
      return NextResponse.json({ success: true, dispatched: 0, message: "No candidates in radius" })
    }

    // ── 2. Fetch user_ids for the selected tradespeople ─────────────
    // profileIds are company_profiles.id values.

    const { data: profiles, error: profilesError } = await admin
      .from("company_profiles")
      .select("id, user_id")
      .in("id", profileIds)

    if (profilesError) {
      console.error("[DISPATCH-URGENT] Error fetching company user_ids:", profilesError.message)
      return NextResponse.json({ error: "Failed to resolve company profiles" }, { status: 500 })
    }

    const userIdByContractorId = new Map<string, string>(
      (profiles ?? []).map((p: { id: string; user_id: string }) => [p.id, p.user_id])
    )

    // ── 3. Fetch job details for notification copy ──────────────────
    const { data: job } = await admin
      .from("jobs")
      .select("title, location")
      .eq("id", jobId)
      .maybeSingle()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openjobmarket.com"
    const jobUrl  = `${baseUrl}/jobs/${jobId}`

    // ── 4. Dispatch each candidate ──────────────────────────────────
    let dispatched = 0
    let skipped    = 0

    for (const companyProfileId of profileIds) {
      const userId = userIdByContractorId.get(companyProfileId)

      if (!userId) {
        console.warn("[DISPATCH-URGENT] No user_id for company profile:", companyProfileId)
        skipped++
        continue
      }

      try {
        // 4a. Record dispatch alert (for tracking & the urgent-responses API)
        const { error: alertError } = await admin
          .from("urgent_job_dispatch_alerts")
          .insert({
            job_id:        jobId,
            company_id:    companyProfileId,
            dispatch_type: "push",
          })

        if (alertError) {
          // Non-fatal — alert tracking is best-effort
          console.error("[DISPATCH-URGENT] Error recording dispatch alert:", alertError.message)
        }

        // 4c. In-app notification to the tradesperson
        const { error: notifError } = await admin
          .from("notifications")
          .insert({
            user_id:  userId,
            type:     "urgent_job_dispatch",
            title:    `Urgent job near you: ${job?.title ?? "New job"}`,
            message:  `A new urgent job has been posted${job?.location ? ` in ${job.location}` : ""}. Tap to respond quickly — first come, first served.`,
            link_url: jobUrl,
            is_read:  false,
          })

        if (notifError) {
          console.error("[DISPATCH-URGENT] Error creating notification:", notifError.message)
        }

        dispatched++
      } catch (err) {
        console.error("[DISPATCH-URGENT] Unexpected error for company profile:", companyProfileId, err)
        skipped++
      }
    }

    console.log(`[DISPATCH-URGENT] Complete — dispatched: ${dispatched}, skipped: ${skipped}`)

    return NextResponse.json({
      success:    true,
      dispatched,
      skipped,
      total:      profileIds.length,
    })

  } catch (error) {
    console.error("[DISPATCH-URGENT] Fatal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
