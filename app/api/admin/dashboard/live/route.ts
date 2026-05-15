export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js"
import { getAdminUser } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const ago5m  = new Date(now.getTime() - 5  * 60_000).toISOString()
    const ago12m = new Date(now.getTime() - 12 * 60_000).toISOString()
    const ago1h  = new Date(now.getTime() - 60 * 60_000).toISOString()
    const ago24h = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()
    const in10m  = new Date(now.getTime() + 10 * 60_000).toISOString()
    const today  = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    // ── Parallel queries ────────────────────────────────────────────────────

    const [
      liveJobsRes,
      onlineTpsRes,
      dispatchStreamRes,
      reportsRes,
      feedbackRes,
      cancelledJobsRes,
      lowRatingsRes,
      pushTokensRes,
    ] = await Promise.allSettled([
      // All active urgent jobs + attention candidates
      db.from("jobs")
        .select("id, title, location, industry, status, dispatch_state, dispatch_radius_miles, dispatch_started_at, dispatch_expires_at, is_urgent, created_at, homeowner_id")
        .eq("is_urgent", true)
        .gte("created_at", ago24h)
        .order("created_at", { ascending: false }),

      // Online tradespeople right now
      db.from("company_profiles")
        .select("id, company_name, industry, latitude, longitude, open_for_business")
        .eq("open_for_business", true),

      // Dispatch stream: recent alerts with response info
      db.from("urgent_job_dispatch_alerts")
        .select("job_id, responded, responded_at, dispatched_at, distance_miles, company_id")
        .gte("dispatched_at", ago24h)
        .order("dispatched_at", { ascending: false }),

      // User reports today
      db.from("user_reports")
        .select("id, reported_user_id, created_at")
        .gte("created_at", todayStr),

      // Latest feedback
      db.from("app_feedback")
        .select("id, feedback_type, message, page_url, created_at")
        .order("created_at", { ascending: false })
        .limit(8),

      // Recent cancelled jobs (for high-cancel homeowners)
      db.from("jobs")
        .select("id, homeowner_id, status, created_at")
        .eq("status", "CANCELLED")
        .gte("created_at", ago24h),

      // Recent low-rated reviews
      db.from("reviews")
        .select("id, rating, created_at")
        .lte("rating", 2)
        .gte("created_at", ago24h),

      // Push token count (proxy for push health)
      db.from("user_push_tokens")
        .select("id", { count: "exact", head: true }),
    ])

    const liveJobs    = liveJobsRes.status    === "fulfilled" ? (liveJobsRes.value.data    ?? []) : []
    const onlineTps   = onlineTpsRes.status   === "fulfilled" ? (onlineTpsRes.value.data   ?? []) : []
    const alerts      = dispatchStreamRes.status === "fulfilled" ? (dispatchStreamRes.value.data ?? []) : []
    const reports     = reportsRes.status     === "fulfilled" ? (reportsRes.value.data     ?? []) : []
    const feedbackRaw = feedbackRes.status    === "fulfilled" ? (feedbackRes.value.data    ?? []) : []
    const cancelJobs  = cancelledJobsRes.status === "fulfilled" ? (cancelledJobsRes.value.data ?? []) : []
    const lowRatings  = lowRatingsRes.status  === "fulfilled" ? (lowRatingsRes.value.data  ?? []) : []
    const pushCount   = pushTokensRes.status  === "fulfilled" ? (pushTokensRes.value.count ?? 0)  : 0

    // ── Status bar ──────────────────────────────────────────────────────────

    // A job is truly active if it hasn't passed its dispatch expiry
    // (expired jobs may still have dispatch_state="searching" when the cron is stale)
    const nowIso = now.toISOString()
    const isStillActive = (j: any) =>
      !j.dispatch_expires_at || j.dispatch_expires_at > nowIso

    const activeUrgent    = liveJobs.filter((j: any) => ["searching", "expanding"].includes(j.dispatch_state) && isStillActive(j))
    const waitingResponse = liveJobs.filter((j: any) => j.dispatch_state === "searching" && j.dispatch_started_at && isStillActive(j))
    const expanding       = liveJobs.filter((j: any) => j.dispatch_state === "expanding" && isStillActive(j))
    const noMatchJobs     = liveJobs.filter((j: any) =>
      j.dispatch_state === "expired" ||
      (j.status === "POSTED" && j.dispatch_expires_at && j.dispatch_expires_at < nowIso)
    )

    // Last dispatch activity (proxy for cron health)
    const lastAlert    = alerts[0]
    const lastCronMins = lastAlert
      ? Math.round((now.getTime() - new Date(lastAlert.dispatched_at).getTime()) / 60_000)
      : null

    // ── Attention alerts ────────────────────────────────────────────────────

    // Map of alerts per job
    const alertsByJob: Record<string, any[]> = {}
    for (const a of alerts as any[]) {
      if (!alertsByJob[a.job_id]) alertsByJob[a.job_id] = []
      alertsByJob[a.job_id].push(a)
    }

    const attentionAlerts: any[] = []

    for (const job of liveJobs as any[]) {
      const jobAlerts = alertsByJob[job.id] || []
      const hasResponse = jobAlerts.some((a: any) => a.responded)
      const startedMins = job.dispatch_started_at
        ? Math.round((now.getTime() - new Date(job.dispatch_started_at).getTime()) / 60_000)
        : null

      // Skip jobs that have already passed their dispatch expiry — they are not actively live.
      // (The cron may not have updated dispatch_state to "expired" yet, so we guard here.)
      const alreadyExpired = job.dispatch_expires_at && job.dispatch_expires_at <= nowIso

      // Urgent job with no response > 5 min (and not yet expired)
      if (job.dispatch_state === "searching" && !hasResponse && startedMins !== null && startedMins >= 5 && !alreadyExpired) {
        attentionAlerts.push({
          type: "no_response",
          severity: startedMins >= 20 ? "critical" : "warning",
          message: `No response — ${job.title || "Untitled"} in ${job.location || "unknown area"}`,
          jobId: job.id,
          age: startedMins,
          industry: job.industry,
          location: job.location,
        })
      }

      // Close to 15-min radius expansion (started 10-14 min ago, still at 3 miles)
      if (
        job.dispatch_state === "searching" &&
        (job.dispatch_radius_miles ?? 3) <= 3 &&
        startedMins !== null && startedMins >= 10 && startedMins < 16 &&
        !alreadyExpired
      ) {
        attentionAlerts.push({
          type: "near_expansion",
          severity: "warning",
          message: `Expanding radius soon — ${job.title || "Untitled"} (${startedMins}m elapsed)`,
          jobId: job.id,
          age: startedMins,
          location: job.location,
        })
      }

      // Near 1-hour expiry
      if (job.dispatch_expires_at) {
        const expiresInMins = Math.round(
          (new Date(job.dispatch_expires_at).getTime() - now.getTime()) / 60_000
        )
        if (expiresInMins > 0 && expiresInMins <= 12 && job.status === "POSTED") {
          attentionAlerts.push({
            type: "near_expiry",
            severity: expiresInMins <= 5 ? "critical" : "warning",
            message: `Expiring in ${expiresInMins}m — ${job.title || "Untitled"} in ${job.location || "?"}`,
            jobId: job.id,
            age: expiresInMins,
            location: job.location,
          })
        }
      }
    }

    // Cron health alert — if the dispatch cron is very stale, surface it as an alert
    if (lastCronMins !== null && lastCronMins > 30) {
      attentionAlerts.push({
        type: "no_response",  // reuse Clock icon
        severity: lastCronMins > 120 ? "critical" : "warning",
        message: `Dispatch cron stalled — last run ${lastCronMins}m ago. Jobs may not be expiring or expanding.`,
        age: lastCronMins,
      })
    }

    // High-cancel homeowners today
    const cancelMap: Record<string, number> = {}
    for (const j of cancelJobs as any[]) {
      if (j.homeowner_id) cancelMap[j.homeowner_id] = (cancelMap[j.homeowner_id] || 0) + 1
    }
    const spamCancellers = Object.entries(cancelMap)
      .filter(([, c]) => c >= 2)
      .map(([id, c]) => ({ homeownerId: id, cancellations: c }))

    if (spamCancellers.length > 0) {
      attentionAlerts.push({
        type: "cancellation_spike",
        severity: "warning",
        message: `${spamCancellers.length} homeowner(s) cancelled 2+ jobs today`,
        count: spamCancellers.length,
      })
    }

    // Low ratings today
    if (lowRatings.length >= 3) {
      attentionAlerts.push({
        type: "low_ratings",
        severity: "warning",
        message: `${lowRatings.length} low-rated completions in last 24h`,
        count: lowRatings.length,
      })
    }

    // Reports today
    if (reports.length > 0) {
      attentionAlerts.push({
        type: "reports",
        severity: reports.length >= 3 ? "critical" : "warning",
        message: `${reports.length} user report${reports.length > 1 ? "s" : ""} today — needs review`,
        count: reports.length,
      })
    }

    // Sort: critical first, then by age
    attentionAlerts.sort((a, b) => {
      if (a.severity === "critical" && b.severity !== "critical") return -1
      if (b.severity === "critical" && a.severity !== "critical") return 1
      return (b.age ?? 0) - (a.age ?? 0)
    })

    // ── Dispatch stream ──────────────────────────────────────────────────────

    // Build per-job stream from recent jobs
    const streamJobs = liveJobs.slice(0, 20)
    const dispatchStream = streamJobs.map((job: any) => {
      const jobAlerts = alertsByJob[job.id] || []
      const responded = jobAlerts.filter((a: any) => a.responded)
      const firstResponse = responded.length > 0
        ? responded.reduce((min: any, a: any) =>
            new Date(a.responded_at) < new Date(min.responded_at) ? a : min
          )
        : null
      const firstDispatch = jobAlerts.length > 0
        ? jobAlerts.reduce((min: any, a: any) =>
            new Date(a.dispatched_at) < new Date(min.dispatched_at) ? a : min
          )
        : null
      const firstResponseMins = firstResponse && firstDispatch
        ? Math.round((new Date(firstResponse.responded_at).getTime() - new Date(firstDispatch.dispatched_at).getTime()) / 60_000)
        : null

      return {
        jobId: job.id,
        title: job.title || "Untitled job",
        location: job.location || "Unknown",
        industry: job.industry || "General",
        startedAt: job.dispatch_started_at || job.created_at,
        radiusMiles: job.dispatch_radius_miles ?? 3,
        state: job.dispatch_state || "unknown",
        status: job.status,
        alertCount: jobAlerts.length,
        responseCount: responded.length,
        firstResponseMins,
      }
    })

    // ── Supply gaps ──────────────────────────────────────────────────────────

    // Industries where recent urgent jobs got no responses
    const noResponseJobs = liveJobs.filter((j: any) => {
      const jobAlerts = alertsByJob[j.id] || []
      return !jobAlerts.some((a: any) => a.responded)
    })
    const noResponseByIndustry: Record<string, number> = {}
    for (const j of noResponseJobs as any[]) {
      const ind = j.industry || "Unknown"
      noResponseByIndustry[ind] = (noResponseByIndustry[ind] || 0) + 1
    }
    const supplyGaps = Object.entries(noResponseByIndustry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([industry, count]) => ({ industry, count }))

    // Locations with repeated expansions to 10 miles
    const expandedJobs = liveJobs.filter((j: any) => (j.dispatch_radius_miles ?? 3) >= 10)
    const expandedByArea: Record<string, number> = {}
    for (const j of expandedJobs as any[]) {
      const area = (j.location || "").split(",")[0]?.trim() || "Unknown"
      expandedByArea[area] = (expandedByArea[area] || 0) + 1
    }
    const deadZones = Object.entries(expandedByArea)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }))

    // ── Trust flags ──────────────────────────────────────────────────────────

    const trustFlags = {
      reportsToday: reports.length,
      highCancelCount: spamCancellers.length,
      lowRatingsToday: lowRatings.length,
    }

    // ── Feedback snapshot ────────────────────────────────────────────────────

    const feedbackSnapshot = (feedbackRaw as any[]).slice(0, 5).map((f: any) => ({
      type: f.feedback_type,
      message: f.message,
      pageUrl: f.page_url,
      createdAt: f.created_at,
    }))

    return NextResponse.json({
      generatedAt: now.toISOString(),
      statusBar: {
        activeUrgentJobs: activeUrgent.length,
        jobsWaitingResponse: waitingResponse.length,
        jobsExpandingRadius: expanding.length,
        noMatchJobs: noMatchJobs.length,
        onlineTradespeople: onlineTps.length,
        pushTokens: pushCount,
        lastCronMins,
        systemOk: lastCronMins === null || lastCronMins < 30,
      },
      attentionAlerts: attentionAlerts.slice(0, 12),
      dispatchStream,
      supplyGaps,
      deadZones,
      trustFlags,
      feedbackSnapshot,
    })

  } catch (err) {
    console.error("[DASHBOARD-LIVE]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
