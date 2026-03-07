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
    const { data: top5, error: rpcError } = await admin.rpc(
      "select_top_tradespeople_for_urgent_job",
      { p_job_id: jobId }
    )

    if (rpcError) {
      // RPC raises an exception for non-POSTED / non-urgent jobs — surface it
      console.error("[DISPATCH-URGENT] RPC error:", rpcError.message)
      return NextResponse.json(
        { error: rpcError.message },
        { status: 422 }
      )
    }

    if (!top5 || top5.length === 0) {
      console.log("[DISPATCH-URGENT] No candidates found for job:", jobId)
      return NextResponse.json({ success: true, dispatched: 0, message: "No candidates in radius" })
    }

    console.log(`[DISPATCH-URGENT] RPC returned ${top5.length} candidate(s) for job ${jobId}`)

    // ── 2. Fetch user_ids for the selected contractors ──────────────
    // The RPC returns tradesperson_id (= contractor_profiles.id) + total_score.
    // We need user_id to create notifications.
    const contractorProfileIds: string[] = top5.map((c: { tradesperson_id: string }) => c.tradesperson_id)

    const { data: profiles, error: profilesError } = await admin
      .from("contractor_profiles")
      .select("id, user_id")
      .in("id", contractorProfileIds)

    if (profilesError) {
      console.error("[DISPATCH-URGENT] Error fetching contractor user_ids:", profilesError.message)
      return NextResponse.json({ error: "Failed to resolve contractor profiles" }, { status: 500 })
    }

    const userIdByContractorId = new Map<string, string>(
      (profiles ?? []).map((p: { id: string; user_id: string }) => [p.id, p.user_id])
    )

    // ── 3. Fetch job details for notification copy ──────────────────
    const { data: job } = await admin
      .from("jobs")
      .select("title, location")
      .eq("id", jobId)
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openjobmarket.com"
    const jobUrl  = `${baseUrl}/jobs/${jobId}`

    // ── 4. Dispatch each candidate ──────────────────────────────────
    let dispatched = 0
    let skipped    = 0

    for (const candidate of top5) {
      const contractorId: string = candidate.tradesperson_id
      const userId = userIdByContractorId.get(contractorId)

      if (!userId) {
        console.warn("[DISPATCH-URGENT] No user_id for contractor:", contractorId)
        skipped++
        continue
      }

      try {
        // 4a. Create job application — PENDING, not auto-confirmed.
        //     ON CONFLICT DO NOTHING: safe to re-run (idempotent).
        const { error: appError } = await admin
          .from("job_applications")
          .insert({
            job_id:        jobId,
            contractor_id: contractorId,
            status:        "PENDING",
          })

        if (appError) {
          // Unique violation = already applied — skip silently
          if (appError.code === "23505") {
            console.log("[DISPATCH-URGENT] Already has application, skipping:", contractorId)
            skipped++
            continue
          }
          console.error("[DISPATCH-URGENT] Error creating application:", appError.message)
        }

        // 4b. Record dispatch alert (for tracking & the urgent-responses API)
        const { error: alertError } = await admin
          .from("urgent_job_dispatch_alerts")
          .insert({
            job_id:        jobId,
            contractor_id: contractorId,
            dispatch_type: "push",
          })

        if (alertError) {
          console.error("[DISPATCH-URGENT] Error recording dispatch alert:", alertError.message)
          // Non-fatal — continue
        }

        // 4c. In-app notification to the contractor
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
          // Non-fatal — application already created
        }

        dispatched++
        console.log(`[DISPATCH-URGENT] Dispatched to contractor ${contractorId} (score: ${candidate.total_score})`)
      } catch (err) {
        console.error("[DISPATCH-URGENT] Unexpected error for contractor:", contractorId, err)
        skipped++
      }
    }

    console.log(`[DISPATCH-URGENT] Complete — dispatched: ${dispatched}, skipped: ${skipped}`)

    return NextResponse.json({
      success:    true,
      dispatched,
      skipped,
      total:      top5.length,
    })

  } catch (error) {
    console.error("[DISPATCH-URGENT] Fatal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
