import { createAdminClient } from "@/lib/server"
import { notifyOne } from "@/lib/dispatch-notify"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/jobs/[id]/dispatch-urgent
 *
 * Uber-style urgent dispatch — tiered radius, instant skip on empty radius.
 *
 * Flow:
 *   1. Rank candidates via geospatial RPC (3-mile radius, top 5)
 *   2. If 0 at current radius → immediately jump to 5mi, then 10mi (instant skip)
 *   3. Fallback to industry-matched company_profiles if RPC unavailable
 *   4. For each candidate: record alert row → in-app notification → web push
 *   5. Set dispatch_started_at / dispatch_expires_at / dispatch_radius_miles / dispatch_state
 *   6. If < 3 dispatched → trigger adaptive expansion RPC for next wave
 */

// Radius expansion tiers (miles)
const RADIUS_TIERS = [3, 5, 10]

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const admin = createAdminClient()

    // ── 1. Fetch job details (title, location, coordinates) ──────────────────
    const { data: job } = await admin
      .from("jobs")
      .select("title, location, dispatch_state")
      .eq("id", jobId)
      .maybeSingle()

    // ── 2. Candidate selection: tiered radius with instant skip ──────────────
    let profileIds: string[] = []
    let usedRadiusMiles = RADIUS_TIERS[0]

    // Try each radius tier — skip instantly if 0 candidates found
    for (const radius of RADIUS_TIERS) {
      usedRadiusMiles = radius

      const { data: top5, error: rpcError } = await admin.rpc(
        "select_top_tradespeople_for_urgent_job",
        { p_job_id: jobId }
      )

      if (rpcError) {
        console.warn(`[DISPATCH-URGENT] RPC failed at ${radius}mi:`, rpcError.message)
        break // RPC unavailable — fall through to direct query
      }

      if (top5 && top5.length > 0) {
        profileIds = top5.map((c: { tradesperson_id: string }) => c.tradesperson_id)
        console.log(`[DISPATCH-URGENT] RPC: ${profileIds.length} candidate(s) at ${radius}mi`)
        break
      }

      console.log(`[DISPATCH-URGENT] 0 candidates at ${radius}mi — instant skip to next tier`)
    }

    // ── 2b. Fallback: direct company_profiles query ──────────────────────────
    if (profileIds.length === 0) {
      console.log("[DISPATCH-URGENT] Using direct company_profiles fallback")

      const { data: jobData } = await admin
        .from("jobs")
        .select("category, title")
        .eq("id", jobId)
        .maybeSingle()

      const { data: allCandidates } = await admin
        .from("company_profiles")
        .select("id, industry, services")
        .eq("open_for_business", true)
        .eq("trade_job_notifications", true)
        .limit(100)

      if (allCandidates && allCandidates.length > 0) {
        const jobCategory = (jobData?.category || jobData?.title || "").toLowerCase()
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
          if (matched.length === 0) {
            console.log("[DISPATCH-URGENT] No skill match — using all opted-in companies")
            matched = allCandidates
          }
        }

        profileIds = matched.slice(0, 10).map((p: { id: string }) => p.id)
        console.log(`[DISPATCH-URGENT] Fallback: ${profileIds.length} company(s)`)
      }
    }

    if (profileIds.length === 0) {
      console.log("[DISPATCH-URGENT] No candidates found for job:", jobId)
      // Mark dispatch started but expired (nothing to do)
      await setDispatchLifecycle(admin, jobId, { state: "expired", radiusMiles: usedRadiusMiles })
      return NextResponse.json({ success: true, dispatched: 0, message: "No candidates found" })
    }

    // ── 3. Resolve user_ids for selected company profiles ────────────────────
    const { data: profiles, error: profilesError } = await admin
      .from("company_profiles")
      .select("id, user_id")
      .in("id", profileIds)

    if (profilesError) {
      console.error("[DISPATCH-URGENT] Error fetching user_ids:", profilesError.message)
      return NextResponse.json({ error: "Failed to resolve company profiles" }, { status: 500 })
    }

    const userIdByContractorId = new Map<string, string>(
      (profiles ?? []).map((p: { id: string; user_id: string }) => [p.id, p.user_id])
    )

    // ── 4. Start dispatch lifecycle ──────────────────────────────────────────
    await setDispatchLifecycle(admin, jobId, {
      state:       "searching",
      radiusMiles: usedRadiusMiles,
      started:     true,
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openjobmarket.com"
    const jobUrl  = `${baseUrl}/jobs/${jobId}`

    // ── 5. Notify each candidate ─────────────────────────────────────────────
    let dispatched = 0
    let skipped    = 0

    for (const companyProfileId of profileIds) {
      const userId = userIdByContractorId.get(companyProfileId)

      if (!userId) {
        console.warn("[DISPATCH-URGENT] No user_id for company:", companyProfileId)
        skipped++
        continue
      }

      try {
        // Skip if already applied
        const { data: existingApp } = await admin
          .from("job_applications")
          .select("id")
          .eq("job_id", jobId)
          .eq("company_id", companyProfileId)
          .maybeSingle()

        if (existingApp) {
          console.log("[DISPATCH-URGENT] Skipping — already applied:", companyProfileId)
          skipped++
          continue
        }

        // Insert alert row (push_attempted=false until notifyOne sets it)
        const { error: insertErr } = await admin
          .from("urgent_job_dispatch_alerts")
          .insert({
            job_id:         jobId,
            company_id:     companyProfileId,
            dispatch_type:  "push",
            push_attempted: false,
            push_sent:      false,
            responded:      false,
          })
        if (insertErr) console.error("[DISPATCH-URGENT] Alert insert failed:", insertErr.message)

        await notifyOne(admin, { companyProfileId, userId }, {
          jobId, jobTitle: job?.title, location: job?.location, jobUrl,
        })

        dispatched++
      } catch (err) {
        console.error("[DISPATCH-URGENT] Error for company:", companyProfileId, err)
        skipped++
      }
    }

    console.log(`[DISPATCH-URGENT] Initial: dispatched=${dispatched} skipped=${skipped} radius=${usedRadiusMiles}mi`)

    // ── 6. Adaptive expansion if < 3 dispatched ──────────────────────────────
    let expandDispatched = 0

    if (dispatched < 3) {
      console.log(`[DISPATCH-URGENT] < 3 dispatched — triggering expand_job_search`)

      const { data: expanded, error: expandErr } = await admin.rpc("expand_job_search", { p_job_id: jobId })

      if (expandErr) {
        console.warn("[DISPATCH-URGENT] expand_job_search error:", expandErr.message)
      } else if (expanded && expanded.length > 0) {
        const expandedIds = expanded.map((r: { company_id: string }) => r.company_id)

        const { data: expandedProfiles } = await admin
          .from("company_profiles")
          .select("id, user_id")
          .in("id", expandedIds)

        const expandedUserIdMap = new Map<string, string>(
          (expandedProfiles ?? []).map((p: { id: string; user_id: string }) => [p.id, p.user_id])
        )

        // Update dispatch state to expanding
        await admin
          .from("jobs")
          .update({ dispatch_state: "expanding", dispatch_radius_miles: nextRadius(usedRadiusMiles) })
          .eq("id", jobId)

        for (const { company_id: cid, radius_used } of expanded) {
          const uid = expandedUserIdMap.get(cid)
          if (!uid) continue

          try {
            await admin
              .from("urgent_job_dispatch_alerts")
              .insert({
                job_id:         jobId,
                company_id:     cid,
                dispatch_type:  "push",
                push_attempted: false,
                push_sent:      false,
                responded:      false,
              })

            await notifyOne(admin, { companyProfileId: cid, userId: uid }, {
              jobId, jobTitle: job?.title, location: job?.location, jobUrl,
            })

            expandDispatched++
            console.log(`[DISPATCH-URGENT] Expanded: company=${cid} radius=${radius_used}mi`)
          } catch (err) {
            console.error("[DISPATCH-URGENT] Expand error:", cid, err)
          }
        }
      }
    }

    const totalDispatched = dispatched + expandDispatched
    console.log(`[DISPATCH-URGENT] Complete: initial=${dispatched} expanded=${expandDispatched} total=${totalDispatched}`)

    return NextResponse.json({
      success:    true,
      dispatched: totalDispatched,
      initial:    dispatched,
      expanded:   expandDispatched,
      skipped,
      total:      profileIds.length,
      radiusMiles: usedRadiusMiles,
    })

  } catch (error) {
    console.error("[DISPATCH-URGENT] Fatal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextRadius(current: number): number {
  const TIERS = [3, 5, 10]
  const idx = TIERS.indexOf(current)
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : current
}

async function setDispatchLifecycle(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  opts: { state: string; radiusMiles: number; started?: boolean }
) {
  try {
    const patch: Record<string, any> = {
      dispatch_state:        opts.state,
      dispatch_radius_miles: opts.radiusMiles,
      job_state:             opts.state === "searching" ? "searching" : undefined,
    }
    if (opts.started) {
      patch.dispatch_started_at = new Date().toISOString()
      patch.dispatch_expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString() // +1 hour
      patch.search_started_at   = new Date().toISOString()
    }
    // Remove undefined keys
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k])
    await admin.from("jobs").update(patch).eq("id", jobId)
  } catch {
    // Non-fatal — lifecycle tracking is best-effort
  }
}
