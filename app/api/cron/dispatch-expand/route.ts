import { createAdminClient } from "@/lib/server"
import { notifyOne } from "@/lib/dispatch-notify"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/cron/dispatch-expand
 *
 * Uber-style radius expansion cron — runs every 2 minutes (see vercel.json).
 *
 * Expansion tiers (set by expand_job_search via jobs.next_expand_at):
 *   3mi → wait 15 min → 5mi
 *   5mi → wait 15 min → 10mi
 *   10mi → wait 30 min → no further expansion (or instant skip if 0 local supply)
 *
 * Each invocation:
 *   1. Expire jobs past their 1-hour window
 *   2. Mark dispatch as completed when >= 3 responders (belt+suspenders — trigger does this atomically too)
 *   3. Find jobs whose next_expand_at <= NOW() (precise timing, no elapsed-since-start drift)
 *   4. For each: expand_job_search() → notify new batch
 *
 * Auth: Vercel CRON_SECRET header.
 */

export async function GET(request: NextRequest) {
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

    // ── 2. Belt-and-suspenders: complete jobs with >= 3 responders ───────────
    // The DB trigger (trg_auto_complete_dispatch) handles this atomically on each
    // response, but we also sweep here to catch any edge cases.
    const { data: activeJobs } = await admin
      .from("jobs")
      .select("id")
      .in("dispatch_state", ["searching", "expanding"])

    for (const { id: jobId } of activeJobs ?? []) {
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

    // ── 3. Jobs ready for expansion (next_expand_at <= NOW()) ────────────────
    // expand_job_search sets next_expand_at per tier:
    //   ≤3mi → +15min | ≤5mi → +15min | ≤10mi → +30min | >10mi → NULL (done)
    const { data: expandableJobs } = await admin
      .from("jobs")
      .select("id, title, location, dispatch_radius_miles, next_expand_at")
      .in("dispatch_state", ["searching", "expanding"])
      .gt("dispatch_expires_at", now.toISOString())
      .lte("next_expand_at", now.toISOString())
      .not("next_expand_at", "is", null)

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openjobmarket.com"

    for (const job of expandableJobs ?? []) {
      // Confirm still 0 responses — don't expand if someone already responded
      const { count: respCount } = await admin
        .from("urgent_job_dispatch_alerts")
        .select("*", { count: "exact", head: true })
        .eq("job_id", job.id)
        .eq("responded", true)

      if ((respCount ?? 0) > 0) {
        // Got a response — clear next_expand_at so we stop expanding
        await admin
          .from("jobs")
          .update({ next_expand_at: null, dispatch_state: "completed" })
          .eq("id", job.id)
        console.log(`[DISPATCH-EXPAND] job=${job.id} has responses — skipping expansion, marking completed`)
        continue
      }

      const oldRadius: number = job.dispatch_radius_miles ?? 3
      console.log(`[DISPATCH-EXPAND] Expanding job=${job.id} from ${oldRadius}mi`)

      let notifiedCount = 0
      let finalRadius = oldRadius

      // expand_job_search handles instant-skip (0 local supply → jump to 10mi)
      // and sets next_expand_at for the new tier automatically.
      const { data: expanded, error: expandErr } = await admin.rpc("expand_job_search", {
        p_job_id: job.id,
      })

      if (expandErr) {
        console.warn(`[DISPATCH-EXPAND] expand_job_search error job=${job.id}:`, expandErr.message)
        continue
      }

      if (!expanded || expanded.length === 0) {
        console.log(`[DISPATCH-EXPAND] job=${job.id}: expand_job_search returned 0 new candidates`)
        continue
      }

      // Notify new batch
      const expandedIds = expanded.map((r: { company_id: string }) => r.company_id)
      finalRadius = expanded[0]?.radius_used ?? oldRadius

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

          notifiedCount++
        } catch (err) {
          console.error(`[DISPATCH-EXPAND] Notify error job=${job.id} company=${cid}:`, err)
        }
      }

      // Update dispatch_radius_miles to match new radius
      await admin
        .from("jobs")
        .update({ dispatch_radius_miles: finalRadius, dispatch_state: "expanding" })
        .eq("id", job.id)

      report.expanded.push({ jobId: job.id, from: oldRadius, to: finalRadius, notified: notifiedCount })
      console.log(`[DISPATCH-EXPAND] job=${job.id}: ${oldRadius}mi → ${finalRadius}mi, notified=${notifiedCount}`)
    }

    return NextResponse.json({ success: true, ...report })

  } catch (error) {
    console.error("[DISPATCH-EXPAND] Fatal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
