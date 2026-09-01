export const dynamic = 'force-dynamic'

import { createAdminClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

/**
 * GET /api/admin/analytics/marketplace
 *
 * Deliberately small — just the handful of numbers that actually matter for
 * a platform this size: totals, completions, and what's popular. Every value
 * here is a real, live count against the database. No mocked/placeholder
 * numbers — revenue isn't wired up yet, so it's reported as null rather than
 * a fake figure (the UI shows "Coming soon" for it).
 */
export async function GET() {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const admin = createAdminClient()

    const [
      { count: totalHomeowners },
      { count: totalTradespeople },
      { count: totalJobsPosted },
      { count: totalJobsCompleted },
      { data: jobsForPopularity },
      { data: distanceStats },
    ] = await Promise.all([
      admin.from("users").select("*", { count: "exact", head: true }).eq("user_type", "homeowner"),
      admin.from("users").select("*", { count: "exact", head: true }).eq("user_type", "company"),
      admin.from("jobs").select("*", { count: "exact", head: true }),
      admin.from("jobs").select("*", { count: "exact", head: true }).eq("status", "COMPLETED"),
      admin.from("jobs").select("industry"),
      admin.rpc("admin_completed_job_distance_stats"),
    ])

    // ── Average completed-job travel distance + estimated CO₂e avoided ────────
    // Great-circle miles between the confirmed tradesperson's registered
    // location and the job. CO₂e "avoided" is modelled against a baseline trip
    // a tradesperson would have made for a non-local job.
    const BASELINE_ONE_WAY_MILES = 20        // assumed distance for a non-local job
    const VAN_KG_CO2E_PER_MILE   = 0.33      // UK average van, well-to-wheel (DEFRA)
    const ROUND_TRIP             = 2

    const distRow = (Array.isArray(distanceStats) ? distanceStats[0] : distanceStats) as
      | { avg_miles: number | null; sample_size: number | null }
      | null
    const avgJobDistanceMiles = distRow?.avg_miles ?? null
    const completedJobsMeasured = Number(distRow?.sample_size ?? 0)

    const estimatedCo2eAvoidedKg =
      avgJobDistanceMiles != null && completedJobsMeasured > 0
        ? Math.max(0, BASELINE_ONE_WAY_MILES - avgJobDistanceMiles) *
          ROUND_TRIP * VAN_KG_CO2E_PER_MILE * completedJobsMeasured
        : null

    const industryCounts: Record<string, number> = {}
    for (const job of (jobsForPopularity ?? []) as { industry: string | null }[]) {
      if (!job.industry) continue
      industryCounts[job.industry] = (industryCounts[job.industry] ?? 0) + 1
    }
    const mostPopularJobs = Object.entries(industryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      totalUsers: (totalHomeowners ?? 0) + (totalTradespeople ?? 0),
      totalHomeowners: totalHomeowners ?? 0,
      totalTradespeople: totalTradespeople ?? 0,
      totalJobsPosted: totalJobsPosted ?? 0,
      totalJobsCompleted: totalJobsCompleted ?? 0,
      avgJobDistanceMiles,
      completedJobsMeasured,
      estimatedCo2eAvoidedKg,
      mostPopularJobs,
      // Not wired up yet — no billing/payment data exists to report. The UI
      // shows this as "Coming soon" rather than inventing a number.
      revenue: null,
    })
  } catch (error) {
    console.error("[MARKETPLACE-ANALYTICS] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
