import { createAdminClient } from "@/lib/server"
import { notifyOne } from "@/lib/dispatch-notify"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/cron/dispatch-expand
 *
 * Uber-style radius expansion cron — runs every 2 minutes (see vercel.json).
 *
 * Each invocation:
 *   1. Expire jobs that have passed their 1-hour window
 *   2. Complete jobs that already have >= 3 responders
 *   3. Find active jobs that need radius expansion:
 *      - 3mi → 5mi after 5 min with 0 responses
 *      - 5mi → 10mi after 10 min total with 0 responses
 *   4. For each expanding job:
 *      a. Check if 0 candidates at new radius → skip to next tier instantly
 *      b. Notify new batch (in-app + push)
 *      c. Update dispatch_radius_miles + dispatch_state
 *
 * Auth: Vercel CRON_SECRET header (set as env var in Vercel dashboard).
 */

const RADIUS_TIERS = [3, 5, 10] // miles

// Minutes elapsed since dispatch_started_at that trigger each expansion
const EXPANSION_THRESHOLDS: Record<number, number> = {
  3: 5,   // expand 3→5 after 5 min
  5: 10,  // expand 5→10 after 10 min total
}

export async function GET(request: NextRequest) {
  // ── Auth: only Vercel cron or a request with CRON_SECRET may call this ──────
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const now = new Date()
  const report: Record<string, any> = { expired: 0, completed: 0, expanded: [] }

  try {
    // ── 1. Expire jobs past the 1-hour window ────────────────────────────────
    const { data: expired } = await admin
      .from("jobs")
      .update({ dispatch_state: "expired" })
      .lt("dispatch_expires_at", now.toISOString())
      .in("dispatch_state", ["searching", "expanding"])
      .select("id")

    report.expired = expired?.length ?? 0
    if (report.expired > 0) {
      console.log(`[DISPATCH-EXPAND] Expired ${report.expired} job(s)`)
    }

    // ── 2. Complete jobs with >= 3 responders ────────────────────────────────
    const { data: jobsToCheck } = await admin
      .from("jobs")
      .select("id")
      .in("dispatch_state", ["searching", "expanding"])

    for (const { id: jobId } of jobsToCheck ?? []) {
      const { count } = await admin
        .from("urgent_job_dispatch_alerts")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jobId)
        .eq("responded", true)

      if ((count ?? 0) >= 3) {
        await admin.from("jobs").update({ dispatch_state: "completed" }).eq("id", jobId)
        report.completed++
        console.log(`[DISPATCH-EXPAND] Completed job=${jobId} (${count} responders)`)
      }
    }

    // ── 3. Find jobs needing radius expansion ────────────────────────────────
    const { data: activeJobs } = await admin
      .from("jobs")
      .select("id, title, location, dispatch_started_at, dispatch_radius_miles")
      .in("dispatch_state", ["searching", "expanding"])
      .gt("dispatch_expires_at", now.toISOString())

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openjobmarket.com"

    for (const job of activeJobs ?? []) {
      const radiusMiles: number = job.dispatch_radius_miles ?? 3
      const threshold = EXPANSION_THRESHOLDS[radiusMiles]

      // No more expansion beyond 10mi, or no threshold defined
      if (threshold === undefined) continue

      const startedAt = job.dispatch_started_at ? new Date(job.dispatch_started_at) : null
      if (!startedAt) continue

      const elapsedMin = (now.getTime() - startedAt.getTime()) / 60_000
      if (elapsedMin < threshold) continue

      // Confirm still 0 responses
      const { count: respCount } = await admin
        .from("urgent_job_dispatch_alerts")
        .select("*", { count: "exact", head: true })
        .eq("job_id", job.id)
        .eq("responded", true)

      if ((respCount ?? 0) > 0) {
        // Got a response since last check — no expansion needed
        continue
      }

      // ── 4. Expand to next radius tier ──────────────────────────────────────
      console.log(`[DISPATCH-EXPAND] Expanding job=${job.id} from ${radiusMiles}mi (${elapsedMin.toFixed(1)}min elapsed)`)

      let newRadius = nextRadius(radiusMiles)
      let expandedCount = 0

      // Try each remaining tier — skip instantly if 0 candidates
      while (true) {
        const { data: expanded, error: expandErr } = await admin.rpc("expand_job_search", {
          p_job_id: job.id,
        })

        if (expandErr) {
          console.warn(`[DISPATCH-EXPAND] expand_job_search error job=${job.id}:`, expandErr.message)
          break
        }

        if (!expanded || expanded.length === 0) {
          // 0 candidates at this tier — skip instantly to next
          const next = nextRadius(newRadius)
          if (next === newRadius) break // no more tiers
          console.log(`[DISPATCH-EXPAND] 0 candidates at ${newRadius}mi → instant skip to ${next}mi`)
          newRadius = next
          continue
        }

        // Found candidates — notify them
        const expandedIds = expanded.map((r: { company_id: string }) => r.company_id)

        const { data: expandedProfiles } = await admin
          .from("company_profiles")
          .select("id, user_id")
          .in("id", expandedIds)

        const uidMap = new Map<string, string>(
          (expandedProfiles ?? []).map((p: { id: string; user_id: string }) => [p.id, p.user_id])
        )

        for (const { company_id: cid } of expanded) {
          const uid = uidMap.get(cid)
          if (!uid) continue

          try {
            // Create alert row if it doesn't exist yet
            await admin
              .from("urgent_job_dispatch_alerts")
              .upsert(
                {
                  job_id:         job.id,
                  company_id:     cid,
                  dispatch_type:  "push",
                  push_attempted: false,
                  push_sent:      false,
                  responded:      false,
                },
                { onConflict: "job_id,company_id", ignoreDuplicates: true }
              )

            await notifyOne(admin, { companyProfileId: cid, userId: uid }, {
              jobId:    job.id,
              jobTitle: job.title,
              location: job.location,
              jobUrl:   `${baseUrl}/jobs/${job.id}`,
            })

            expandedCount++
          } catch (err) {
            console.error(`[DISPATCH-EXPAND] Notify error job=${job.id} company=${cid}:`, err)
          }
        }

        break // Done for this job
      }

      // Update radius + state
      await admin
        .from("jobs")
        .update({
          dispatch_radius_miles: newRadius,
          dispatch_state:        "expanding",
        })
        .eq("id", job.id)

      report.expanded.push({ jobId: job.id, from: radiusMiles, to: newRadius, notified: expandedCount })
      console.log(`[DISPATCH-EXPAND] job=${job.id}: radius ${radiusMiles}→${newRadius}mi, notified=${expandedCount}`)
    }

    return NextResponse.json({ success: true, ...report })

  } catch (error) {
    console.error("[DISPATCH-EXPAND] Fatal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function nextRadius(current: number): number {
  const idx = RADIUS_TIERS.indexOf(current)
  return idx >= 0 && idx < RADIUS_TIERS.length - 1 ? RADIUS_TIERS[idx + 1] : current
}
