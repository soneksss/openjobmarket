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
      .select("title, location, category, dispatch_state, status, expires_at, is_active, latitude, longitude, budget_min, budget_max, budget_period")
      .eq("id", jobId)
      .maybeSingle()

    // Guard: do not notify tradespeople about jobs that are no longer active.
    // Catches the race condition where a job expires between posting and dispatch.
    if (!job || !job.is_active || job.status === 'COMPLETED' || job.status === 'CANCELLED' ||
        (job.expires_at && new Date(job.expires_at) <= new Date())) {
      console.log(`[DISPATCH-URGENT] Job ${jobId} is expired/inactive — skipping dispatch`, {
        status: job?.status, is_active: job?.is_active, expires_at: job?.expires_at,
      })
      return NextResponse.json({ success: true, dispatched: 0, message: "Job expired or inactive" })
    }

    // ── 2. Candidate selection: tiered radius with instant skip ──────────────
    let profileIds: string[] = []
    let usedRadiusMiles = RADIUS_TIERS[0]

    // Try each radius tier — skip instantly if 0 candidates found
    for (const radius of RADIUS_TIERS) {
      usedRadiusMiles = radius

      const { data: top5, error: rpcError } = await admin.rpc(
        "select_top_tradespeople_for_urgent_job",
        { p_job_id: jobId, p_radius_miles: radius, p_limit: 5 }
      )

      if (rpcError) {
        console.warn(`[DISPATCH-URGENT] RPC failed at ${radius}mi:`, rpcError.message)
        break // RPC unavailable — fall through to direct query
      }

      if (top5 && top5.length > 0) {
        profileIds = top5.map((c: { tradesperson_id: string }) => c.tradesperson_id)
        console.log(
          `[DISPATCH-URGENT] RPC: ${profileIds.length} candidate(s) at ${radius}mi`,
          top5.map((c: any) => ({
            id:          c.tradesperson_id,
            score:       c.total_score,
            dist_mi:     c.distance_miles,
            skill:       c.skill_score,
            lang:        c.language_score,
            freshness:   c.freshness_score,
            reliability: c.reliability_score,
            rating:      c.rating_score,
          }))
        )
        break
      }

      console.log(`[DISPATCH-URGENT] 0 candidates at ${radius}mi — instant skip to next tier`)
    }

    // ── 2b. Fallback: direct company_profiles query ──────────────────────────
    if (profileIds.length === 0) {
      console.log("[DISPATCH-URGENT] Using direct company_profiles fallback")

      const jobLat = (job as any)?.latitude as number | null | undefined
      const jobLon = (job as any)?.longitude as number | null | undefined
      const jobCategory = ((job as any)?.category || (job as any)?.title || "").toLowerCase()

      const { data: allCandidates } = await admin
        .from("company_profiles")
        .select("id, industry, services, latitude, longitude")
        .eq("open_for_business", true)
        .eq("trade_job_notifications", true)
        .limit(200)

      if (allCandidates && allCandidates.length > 0) {
        // 1. Skill filter first — only matching tradespeople
        let matched = jobCategory
          ? allCandidates.filter((p: any) => skillMatch(p, jobCategory))
          : allCandidates

        // 2. Location filter within 15mi if job has coordinates
        if (jobLat && jobLon) {
          const nearby = matched.filter((p: any) => distanceMiles(jobLat, jobLon, p.latitude, p.longitude) <= 15)
          if (nearby.length > 0) {
            matched = nearby
            console.log(`[DISPATCH-URGENT] Fallback: ${nearby.length} skill+location match`)
          } else {
            // No one nearby with coordinates — keep skill-matched list as-is
            console.log(`[DISPATCH-URGENT] Fallback: ${matched.length} skill match (no coords to filter by location)`)
          }
        }

        profileIds = matched.slice(0, 10).map((p: any) => p.id)
        console.log(`[DISPATCH-URGENT] Fallback final: ${profileIds.length} company(s)`)
      }
    }

    // ── 2c. Post-filter RPC results by skill ────────────────────────────────
    // The RPC ranks by distance/score but does not filter by trade type.
    // Re-fetch profiles and drop candidates whose industry/services don't match.
    if (profileIds.length > 0) {
      const jobCategory = ((job as any)?.category || (job as any)?.title || "").toLowerCase()
      if (jobCategory) {
        const { data: skillProfiles } = await admin
          .from("company_profiles")
          .select("id, industry, services")
          .in("id", profileIds)

        const matched = (skillProfiles ?? []).filter((p: any) => skillMatch(p, jobCategory))
        if (matched.length > 0) {
          profileIds = matched.map((p: any) => p.id)
          console.log(`[DISPATCH-URGENT] Skill-filtered RPC results: ${profileIds.length} of original`)
        } else {
          console.log(`[DISPATCH-URGENT] Skill filter returned 0 — keeping all ${profileIds.length} RPC results`)
        }
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

    // ── 4. Record initial batch in job_notifications_sent (dedup) ───────────
    // This prevents expand_job_search from re-notifying the same companies.
    if (profileIds.length > 0) {
      await admin
        .from("job_notifications_sent")
        .upsert(
          profileIds.map(cid => ({ job_id: jobId, company_id: cid, radius_at_time: usedRadiusMiles })),
          { onConflict: "job_id,company_id" }
        )
    }

    // ── 5. Start dispatch lifecycle (sets next_expand_at = +15 min for first tier) ──
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
          budgetMin: (job as any)?.budget_min ?? null,
          budgetMax: (job as any)?.budget_max ?? null,
          budgetPeriod: (job as any)?.budget_period ?? null,
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
              budgetMin: (job as any)?.budget_min ?? null,
              budgetMax: (job as any)?.budget_max ?? null,
              budgetPeriod: (job as any)?.budget_period ?? null,
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

// Strip common English suffixes so "cleaner"→"clean", "cleaning"→"clean", "plumber"→"plumb"
function stemWord(w: string): string {
  return w
    .replace(/ying$/, "y")   // tidying → tidy
    .replace(/nning$/, "n")  // running → run
    .replace(/ning$/, "n")   // cleaning → clean
    .replace(/ing$/, "")     // plumbing → plumb
    .replace(/ners$/, "n")   // cleaners → clean
    .replace(/ner$/, "n")    // cleaner → clean
    .replace(/ers$/, "")     // plumbers → plumb
    .replace(/er$/, "")      // plumber → plumb
    .replace(/ors$/, "")     // contractors → contract
    .replace(/or$/, "")      // contractor → contract
    .replace(/tion$/, "t")   // construction → construct
    .replace(/s$/, "")       // cleanups → cleanup
}

function stemWords(phrase: string): string[] {
  return phrase.toLowerCase()
    .split(/[\s,&/()\-]+/)
    .filter(w => w.length > 2)
    .map(stemWord)
}

function skillMatch(profile: { industry?: string; services?: string[] }, jobCategory: string): boolean {
  const jobStems = stemWords(jobCategory)
  if (jobStems.length === 0) return false

  const industryStems = stemWords(profile.industry || "")
  const serviceStems  = (profile.services || []).flatMap((s: string) => stemWords(s))
  const profileStems  = [...industryStems, ...serviceStems]

  // A match if any job stem shares a root with any profile stem
  return jobStems.some(js =>
    profileStems.some(ps => ps.length > 2 && (ps.startsWith(js) || js.startsWith(ps)))
  )
}

function distanceMiles(lat1: number, lon1: number, lat2?: number | null, lon2?: number | null): number {
  if (!lat2 || !lon2) return Infinity
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
      // Reset deadline_at so the apply_to_job trigger doesn't reject applications
      patch.deadline_at         = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      patch.matching_status     = 'searching'
      // Seed next_expand_at: first tier (≤3mi) waits 15 min before expanding to 5mi
      patch.next_expand_at      = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
    // Remove undefined keys
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k])
    await admin.from("jobs").update(patch).eq("id", jobId)
  } catch {
    // Non-fatal — lifecycle tracking is best-effort
  }
}
