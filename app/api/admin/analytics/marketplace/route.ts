export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js"
import { getAdminUser } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStr = todayStart.toISOString()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysStr = sevenDaysAgo.toISOString()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysStr = thirtyDaysAgo.toISOString()

    // ── 1. Marketplace Health ──────────────────────────────────────────────────
    const [
      { count: totalHomeowners },
      { count: tradespeopleTotal },
      { count: activeTradespeopleNow },
      { count: tradespeopleOnMap },
      { count: jobsPostedToday },
      { count: jobsConfirmedToday },
      { count: jobsCompletedToday },
      { data: jobTypeSplit },
      { count: homeownersLast7d },
      { count: tradespeopleRegisteredLast7d },
      { count: jobsLast7d },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }).eq("user_type", "homeowner"),
      supabase.from("company_profiles").select("*", { count: "exact", head: true }),
      supabase.from("company_profiles").select("*", { count: "exact", head: true }).eq("open_for_business", true),
      supabase.from("company_profiles").select("*", { count: "exact", head: true })
        .eq("open_for_business", true).not("latitude", "is", null).not("longitude", "is", null),
      supabase.from("jobs").select("*", { count: "exact", head: true }).gte("created_at", todayStr),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "CONFIRMED").gte("updated_at", todayStr),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "COMPLETED").gte("updated_at", todayStr),
      supabase.from("jobs").select("is_urgent").gte("created_at", sevenDaysStr),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("user_type", "homeowner").gte("created_at", sevenDaysStr),
      supabase.from("company_profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysStr),
      supabase.from("jobs").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysStr),
    ])

    const urgentCount = (jobTypeSplit || []).filter((j: any) => j.is_urgent === true).length
    const flexibleCount = (jobTypeSplit || []).filter((j: any) => j.is_urgent === false).length

    // ── 2. Dispatch Engine Analytics ─────────────────────────────────────────
    const [
      { data: dispatchAlerts },
      { data: urgentJobs },
    ] = await Promise.all([
      supabase.from("urgent_job_dispatch_alerts")
        .select("job_id, responded, responded_at, dispatched_at, distance_miles")
        .gte("dispatched_at", thirtyDaysStr),
      supabase.from("jobs")
        .select("id, dispatch_state, dispatch_radius_miles, dispatch_expires_at, status")
        .eq("is_urgent", true)
        .gte("created_at", thirtyDaysStr),
    ])

    const respondedAlerts = (dispatchAlerts || []).filter((a: any) => a.responded && a.responded_at && a.dispatched_at)
    const avgFirstResponseMins = respondedAlerts.length > 0
      ? respondedAlerts.reduce((sum: number, a: any) => {
          return sum + (new Date(a.responded_at).getTime() - new Date(a.dispatched_at).getTime()) / 60000
        }, 0) / respondedAlerts.length
      : null

    const totalUrgentJobs = (urgentJobs || []).length
    const resolvedInFirstRadius = (urgentJobs || []).filter((j: any) =>
      (j.dispatch_radius_miles ?? 3) <= 3 && ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(j.status)
    ).length
    const requiring10Mile = (urgentJobs || []).filter((j: any) => (j.dispatch_radius_miles ?? 3) >= 10).length
    const radiusExpanded = (urgentJobs || []).filter((j: any) => (j.dispatch_radius_miles ?? 3) > 3).length
    const expired = (urgentJobs || []).filter((j: any) =>
      j.dispatch_state === "expired" || j.dispatch_state === "completed" && j.status === "CANCELLED"
    ).length
    const expiredByTimer = (urgentJobs || []).filter((j: any) =>
      j.dispatch_expires_at && new Date(j.dispatch_expires_at) < new Date() && j.status === "POSTED"
    ).length

    // avg time to 3 responses per job
    const alertsByJob: Record<string, number[]> = {}
    for (const a of (dispatchAlerts || []) as any[]) {
      if (a.responded && a.responded_at && a.dispatched_at) {
        if (!alertsByJob[a.job_id]) alertsByJob[a.job_id] = []
        alertsByJob[a.job_id].push(
          (new Date(a.responded_at).getTime() - new Date(a.dispatched_at).getTime()) / 60000
        )
      }
    }
    const jobsWith3Responses = Object.values(alertsByJob).filter((times) => times.length >= 3)
    const avgTimeToThreeResponsesMins = jobsWith3Responses.length > 0
      ? jobsWith3Responses.reduce((sum, times) => {
          const sorted = [...times].sort((a, b) => a - b)
          return sum + sorted[2]
        }, 0) / jobsWith3Responses.length
      : null

    // ── 3. Conversion Funnel ─────────────────────────────────────────────────
    const [
      { count: jobsPosted },
      { count: jobsConfirmed },
      { count: jobsCompleted },
      { count: chatsStarted },
    ] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).in("status", ["CONFIRMED", "ACTIVE", "COMPLETED"]),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "COMPLETED"),
      supabase.from("conversations").select("*", { count: "exact", head: true }),
    ])

    const { data: jobsWithResponseData } = await supabase
      .from("urgent_job_dispatch_alerts")
      .select("job_id")
      .eq("responded", true)

    const uniqueJobsWithResponse = new Set((jobsWithResponseData || []).map((a: any) => a.job_id)).size

    // ── 4. Tradesperson Performance Health ───────────────────────────────────
    const { data: tradespeopleStats } = await supabase
      .from("company_profiles")
      .select("open_for_business, trade_job_notifications, flexible_job_notifications, latitude, longitude, company_name, industry")

    const totalProfiles = (tradespeopleStats || []).length
    const availabilityPct = totalProfiles > 0
      ? Math.round((tradespeopleStats || []).filter((p: any) => p.open_for_business).length * 100 / totalProfiles)
      : 0
    const urgentAlertsPct = totalProfiles > 0
      ? Math.round((tradespeopleStats || []).filter((p: any) => p.trade_job_notifications !== false).length * 100 / totalProfiles)
      : 0
    const flexibleAlertsPct = totalProfiles > 0
      ? Math.round((tradespeopleStats || []).filter((p: any) => p.flexible_job_notifications !== false).length * 100 / totalProfiles)
      : 0
    const withLocationPct = totalProfiles > 0
      ? Math.round((tradespeopleStats || []).filter((p: any) => p.latitude && p.longitude).length * 100 / totalProfiles)
      : 0

    const avgResponseSpeedMins = respondedAlerts.length > 0 ? Math.round(avgFirstResponseMins! * 10) / 10 : null

    // ── 5. Geo / Liquidity Insights ──────────────────────────────────────────
    const { data: jobsForGeo } = await supabase
      .from("jobs")
      .select("industry, location, homeowner_id, status")
      .gte("created_at", thirtyDaysStr)

    const industryCount: Record<string, number> = {}
    const locationCount: Record<string, number> = {}
    for (const job of (jobsForGeo || []) as any[]) {
      if (job.industry) industryCount[job.industry] = (industryCount[job.industry] || 0) + 1
      if (job.location) {
        const area = job.location.split(",")[0]?.trim()
        if (area) locationCount[area] = (locationCount[area] || 0) + 1
      }
    }

    const topTrades = Object.entries(industryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    const topLocations = Object.entries(locationCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    // ── 6. Retention + Trust ─────────────────────────────────────────────────
    const [
      { data: jobsByHomeowner },
      { count: totalReviews },
      { count: cancelledJobs },
    ] = await Promise.all([
      supabase.from("jobs").select("homeowner_id"),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "CANCELLED"),
    ])

    const homeownerJobMap: Record<string, number> = {}
    for (const job of (jobsByHomeowner || []) as any[]) {
      if (job.homeowner_id) homeownerJobMap[job.homeowner_id] = (homeownerJobMap[job.homeowner_id] || 0) + 1
    }
    const totalHomeownersWithJobs = Object.keys(homeownerJobMap).length
    const repeatHomeowners = Object.values(homeownerJobMap).filter((c) => c > 1).length
    const repeatHomeownersPct = totalHomeownersWithJobs > 0
      ? Math.round(repeatHomeowners * 100 / totalHomeownersWithJobs)
      : 0
    const totalJobsCount = (jobsByHomeowner || []).length
    const cancellationRate = totalJobsCount > 0
      ? Math.round((cancelledJobs || 0) * 100 / totalJobsCount)
      : 0
    const avgReviewsPerJob = (jobsCompleted || 0) > 0
      ? Math.round((totalReviews || 0) * 10 / (jobsCompleted || 1)) / 10
      : 0

    // ── 7. System Health ─────────────────────────────────────────────────────
    const [
      { count: pushTokensTotal },
      { count: activeDispatchJobs },
    ] = await Promise.all([
      supabase.from("user_push_tokens").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).in("dispatch_state", ["searching", "expanding"]),
    ])

    return NextResponse.json({
      health: {
        totalHomeowners: totalHomeowners || 0,
        tradespeopleTotal: tradespeopleTotal || 0,
        activeTradespeopleNow: activeTradespeopleNow || 0,
        tradespeopleOnMap: tradespeopleOnMap || 0,
        jobsPostedToday: jobsPostedToday || 0,
        jobsConfirmedToday: jobsConfirmedToday || 0,
        jobsCompletedToday: jobsCompletedToday || 0,
        urgentCount,
        flexibleCount,
        homeownersLast7d: homeownersLast7d || 0,
        tradespeopleRegisteredLast7d: tradespeopleRegisteredLast7d || 0,
        jobsLast7d: jobsLast7d || 0,
      },
      dispatch: {
        avgFirstResponseMins: avgFirstResponseMins !== null ? Math.round(avgFirstResponseMins * 10) / 10 : null,
        avgTimeToThreeResponsesMins: avgTimeToThreeResponsesMins !== null ? Math.round(avgTimeToThreeResponsesMins * 10) / 10 : null,
        pctResolvedFirstRadius: totalUrgentJobs > 0 ? Math.round(resolvedInFirstRadius * 100 / totalUrgentJobs) : 0,
        pctRequiring10Mile: totalUrgentJobs > 0 ? Math.round(requiring10Mile * 100 / totalUrgentJobs) : 0,
        radiusExpansionCount: radiusExpanded,
        noTradesFoundRate: totalUrgentJobs > 0 ? Math.round(expired * 100 / totalUrgentJobs) : 0,
        expiryRate: totalUrgentJobs > 0 ? Math.round(expiredByTimer * 100 / totalUrgentJobs) : 0,
        totalUrgentJobs,
      },
      funnel: {
        jobsPosted: jobsPosted || 0,
        jobsWithFirstResponse: uniqueJobsWithResponse,
        jobsConfirmed: jobsConfirmed || 0,
        chatsStarted: chatsStarted || 0,
        jobsCompleted: jobsCompleted || 0,
      },
      tradespersonHealth: {
        totalProfiles,
        availabilityPct,
        urgentAlertsPct,
        flexibleAlertsPct,
        withLocationPct,
        avgResponseSpeedMins,
      },
      geoInsights: {
        topTrades,
        topLocations,
      },
      retention: {
        repeatHomeownersPct,
        cancellationRate,
        totalReviews: totalReviews || 0,
        completedJobs: jobsCompleted || 0,
        avgReviewsPerJob,
      },
      systemHealth: {
        pushTokensTotal: pushTokensTotal || 0,
        activeDispatchJobs: activeDispatchJobs || 0,
        conversationsTotal: chatsStarted || 0,
      },
    })
  } catch (error) {
    console.error("[MARKETPLACE-ANALYTICS] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
