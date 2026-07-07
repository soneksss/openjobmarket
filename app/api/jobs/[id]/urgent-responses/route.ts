import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { sendWebPushToUser } from "@/lib/web-push"

// Safe empty response — never triggers a 500 in the frontend poll
const EMPTY_OK = { success: true, responses: [], alertedTrades: [], notifiedCount: 0, searchRadius: null, jobState: null, applicationCount: 0 }

// GET - Poll for urgent job responses (homeowner's live-search page)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch job
    const { data: job } = await supabase
      .from("jobs")
      .select("id, urgency_type, search_radius_miles, homeowner_id, company_id, job_state, is_tradespeople_job")
      .eq("id", jobId)
      .maybeSingle()

    // Job not in DB yet (still committing after INSERT) — return empty OK so
    // the poll doesn't error-out and the frontend keeps waiting gracefully.
    if (!job) return NextResponse.json(EMPTY_OK)

    // Verify ownership
    let isOwner = false
    if (job.homeowner_id) {
      const { data: hp } = await supabase
        .from("homeowner_profiles")
        .select("user_id")
        .eq("id", job.homeowner_id)
        .maybeSingle()
      isOwner = hp?.user_id === user.id
    }
    if (!isOwner && job.company_id) {
      const { data: cp } = await supabase
        .from("company_profiles")
        .select("user_id")
        .eq("id", job.company_id)
        .maybeSingle()
      isOwner = cp?.user_id === user.id
    }

    if (!isOwner) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Use admin client for both queries — job_applications has no SELECT RLS
    // policy for homeowners, and urgent_job_dispatch_alerts is service_role only.
    let adminClient: ReturnType<typeof createAdminClient>
    try {
      adminClient = createAdminClient()
    } catch {
      // Fallback to user client if admin key not configured (dev only)
      adminClient = supabase as any
    }

    // Advance job state machine — fire-and-forget but awaited so the returned
    // job_state reflects the latest transition.
    let currentJobState: string | null = (job as any).job_state ?? null
    try {
      const { data: advancedState } = await adminClient.rpc("advance_job_state", { p_job_id: jobId })
      if (advancedState) currentJobState = advancedState
    } catch {
      // Non-fatal — state machine is best-effort
    }

    // ── Applications: two-step fetch to avoid PostgREST FK-join naming issues ──
    // Step 1: raw application rows (PENDING = tradesperson applied, homeowner hasn't decided)
    const { data: rawApps, error: appsError } = await adminClient
      .from("job_applications")
      .select("id, status, applied_at, company_id, cover_letter")
      .eq("job_id", jobId)
      .not("company_id", "is", null)
      .in("status", ["PENDING"])
      .order("applied_at", { ascending: false })

    if (appsError) {
      console.error("[URGENT-RESPONSES GET] job_applications query error:", appsError.message, appsError)
    }

    // Step 2: fetch company profiles for applicants
    const appCompanyIds = (rawApps ?? []).map((a: any) => a.company_id).filter(Boolean)
    let appProfiles: Record<string, any> = {}
    if (appCompanyIds.length > 0) {
      const { data: cpRows, error: cpErr } = await adminClient
        .from("company_profiles")
        .select("id, user_id, company_name, logo_url, latitude, longitude")
        .in("id", appCompanyIds)
      if (cpErr) {
        console.error("[URGENT-RESPONSES GET] company_profiles (apps) query error:", cpErr.message)
      }
      for (const cp of cpRows ?? []) appProfiles[cp.id] = cp
    }

    // ── Dispatch alerts: single query includes responded + viewed_at ──────────
    let notifiedCount = 0
    let alertedTrades: any[] = []
    try {
      const isFlexible = (job as any).urgency_type === "flexible"

      if (isFlexible) {
        // Flexible jobs track notifications in job_notifications_sent
        const { count: flexCount } = await adminClient
          .from("job_notifications_sent")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId)
        notifiedCount = flexCount ?? 0
        // alertedTrades stays [] for flexible — no per-company status tracking
      }

      // Single query — include viewed_at so we don't need a second round-trip
      const { data: allAlerts, count } = await adminClient
        .from("urgent_job_dispatch_alerts")
        .select("company_id, responded, viewed_at", { count: "exact" } as any)
        .eq("job_id", jobId)

      if (!isFlexible) notifiedCount = count ?? 0

      // Trades who were dispatched but haven't applied yet
      const respondedIds = new Set(appCompanyIds)
      const pending = (allAlerts ?? []).filter(
        (a: any) => !a.responded && !respondedIds.has(a.company_id)
      )
      const alertedIds = pending.map((a: any) => a.company_id)
      // Build viewed_at map directly from the same query result
      const viewedAtMap = new Map<string, string | null>(
        (allAlerts ?? []).map((a: any) => [a.company_id, (a as any).viewed_at ?? null])
      )

      if (alertedIds.length > 0) {
        const { data: alertProfiles, error: alertProfileErr } = await adminClient
          .from("company_profiles")
          .select("id, user_id, company_name, logo_url, latitude, longitude")
          .in("id", alertedIds)

        if (alertProfileErr) {
          console.error("[URGENT-RESPONSES GET] alertProfiles query error:", alertProfileErr.message)
        }

        alertedTrades = (alertProfiles ?? []).map((p: any) => ({
          id:        p.id,
          user_id:   p.user_id,
          name:      p.company_name || "A tradesperson",
          avatar_url: p.logo_url ?? null,
          viewed_at: viewedAtMap.get(p.id) ?? null,
          lat:       p.latitude  ?? null,
          lng:       p.longitude ?? null,
        }))
      }
    } catch (alertErr) {
      console.error("[URGENT-RESPONSES GET] dispatch alerts block error:", alertErr)
    }

    const responses = (rawApps ?? [])
      .map((app: any) => {
        const p = appProfiles[app.company_id]
        if (!p) return null
        return {
          id:             p.id,
          user_id:        p.user_id,
          name:           p.company_name || "Unknown",
          business_name:  p.company_name,
          avatar_url:     p.logo_url || null,
          rating:         4.5,
          review_count:   0,
          distance_miles: 0,
          response_time:  "Just now",
          verified:       false,
          phone:          null,
          type:           "company",
          message:        app.cover_letter || null,
          lat:            p.latitude  ?? null,
          lng:            p.longitude ?? null,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success:          true,
      responses,
      alertedTrades,
      notifiedCount,
      searchRadius:     job.search_radius_miles,
      jobState:         currentJobState,
      applicationCount: responses.length,
    })

  } catch (error) {
    // Never return 500 — infinite polling would break FindingTradesView
    console.error("[URGENT-RESPONSES GET] Error (returning empty):", error)
    return NextResponse.json(EMPTY_OK)
  }
}

// POST - Tradesperson applies to an urgent job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Read optional message from body
    let message: string | undefined
    try {
      const body = await request.json()
      message = typeof body?.message === "string" && body.message.trim() ? body.message.trim() : undefined
    } catch {}

    // Guard: reject applications once the job is no longer POSTED
    const { data: jobRow } = await supabase
      .from("jobs")
      .select("status, title")
      .eq("id", jobId)
      .maybeSingle()

    if (jobRow && jobRow.status !== "POSTED") {
      return NextResponse.json(
        { error: "This job has already been filled. Sorry, this job has now been assigned to another tradesperson." },
        { status: 409 }
      )
    }

    const { error: applyError } = await supabase.rpc("apply_to_job", { p_job_id: jobId })

    if (applyError) {
      const msg = applyError.message ?? ""

      // Already applied — treat as success
      if (
        applyError.code === "23505" ||
        msg.toLowerCase().includes("already applied") ||
        msg.toLowerCase().includes("unique_violation")
      ) {
        return NextResponse.json({ success: true, message: "Already applied" })
      }

      console.error("[URGENT-RESPONSES POST] apply_to_job error:", {
        message: msg,
        code:    applyError.code,
        details: (applyError as any).details,
        hint:    (applyError as any).hint,
      })

      // Return 409 for business-rule rejections so the client can show a message
      // without treating it as a network/server failure.
      const isBusinessRule =
        msg.includes("no longer accepting") ||
        msg.includes("expired") ||
        msg.includes("maximum number") ||
        msg.includes("Only tradesperson accounts")

      return NextResponse.json(
        { error: msg || "Failed to submit response" },
        { status: isBusinessRule ? 409 : 500 }
      )
    }

    // ── Advance job state so homeowner sees pending_homeowner instantly ──
    const adm = createAdminClient()
    try {
      await adm.rpc("advance_job_state", { p_job_id: jobId })
    } catch {}

    // ── Mark tradesperson as responded (Uber dispatch response tracking) ──────
    // Resolves company_profiles.id for this user, then marks the dispatch alert.
    try {
      const { data: cp } = await adm
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (cp?.id) {
        await adm
          .from("urgent_job_dispatch_alerts")
          .update({ responded: true, responded_at: new Date().toISOString() })
          .eq("job_id", jobId)
          .eq("company_id", cp.id)

        // Check if >= 3 responders → mark dispatch completed
        const { count } = await adm
          .from("urgent_job_dispatch_alerts")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId)
          .eq("responded", true)

        if ((count ?? 0) >= 3) {
          await adm
            .from("jobs")
            .update({ dispatch_state: "completed" })
            .eq("id", jobId)
          console.log(`[URGENT-RESPONSES] 3 responders reached — dispatch completed for job=${jobId}`)
        }
      }
    } catch (err) {
      // Non-fatal — dispatch tracking should never block the application
      console.warn("[URGENT-RESPONSES] Response tracking error (non-fatal):", err)
    }

    // ── Store cover letter / message if provided ──────────────────────
    if (message) {
      try {
        const admin = createAdminClient()
        const { data: cp } = await admin
          .from("company_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()
        if (cp?.id) {
          await admin
            .from("job_applications")
            .update({ cover_letter: message })
            .eq("job_id", jobId)
            .eq("company_id", cp.id)
        }
      } catch {}
    }

    // ── Notify homeowner that a tradesperson applied ──────────────────
    // Fire-and-forget — never block the response on this
    notifyHomeownerOfApplication(jobId, user.id).catch((err) =>
      console.error("[URGENT-RESPONSES POST] Notification error:", err)
    )

    return NextResponse.json({ success: true, message: "Response submitted successfully" })

  } catch (error) {
    console.error("[URGENT-RESPONSES POST] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Notify homeowner — uses admin client so it never blocks on RLS             */
/* ─────────────────────────────────────────────────────────────────────────── */
async function notifyHomeownerOfApplication(jobId: string, applicantUserId: string) {
  const admin = createAdminClient()

  // 1. Fetch the job to get homeowner_id + title
  const { data: job } = await admin
    .from("jobs")
    .select("title, homeowner_id, company_id")
    .eq("id", jobId)
    .maybeSingle()

  if (!job) return

  // 2. Resolve the homeowner's user_id
  let homeownerUserId: string | null = null
  if (job.homeowner_id) {
    const { data: hp } = await admin
      .from("homeowner_profiles")
      .select("user_id")
      .eq("id", job.homeowner_id)
      .maybeSingle()
    homeownerUserId = hp?.user_id ?? null
  } else if (job.company_id) {
    const { data: cp } = await admin
      .from("company_profiles")
      .select("user_id")
      .eq("id", job.company_id)
      .maybeSingle()
    homeownerUserId = cp?.user_id ?? null
  }

  if (!homeownerUserId) return

  // Guard: don't notify the poster about their own job application
  if (homeownerUserId === applicantUserId) return

  // 3. Get the tradesperson's display name (company account)
  let applicantName = "A tradesperson"
  const { data: cp } = await admin
    .from("company_profiles")
    .select("company_name")
    .eq("user_id", applicantUserId)
    .maybeSingle()
  if (cp?.company_name) applicantName = cp.company_name

  // 4. Get the job application ID that was just created
  //    apply_to_job inserts via company_id (profile ID), not user_id directly
  const { data: applicantProfile } = await admin
    .from("company_profiles")
    .select("id")
    .eq("user_id", applicantUserId)
    .maybeSingle()

  let applicationId = jobId // fallback
  if (applicantProfile?.id) {
    const { data: application } = await admin
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("company_id", applicantProfile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (application?.id) applicationId = application.id
  }

  // 5. Insert in-app notification for the homeowner
  const { error } = await admin.from("notifications").insert({
    user_id:  homeownerUserId,
    type:     "job_application",
    title:    `${applicantName} responded to your job`,
    message:  `${applicantName} applied for "${job.title}". Tap to review their profile.`,
    link_url: `/dashboard/homeowner/jobs/${jobId}`,
    is_read:  false,
  })

  if (error) {
    console.error("[URGENT-RESPONSES] Failed to insert homeowner notification:", error.message)
  } else {
    console.log("[URGENT-RESPONSES] Homeowner in-app notified:", homeownerUserId)
  }

  // 6. Send web push so the homeowner hears a sound with phone in pocket
  const { data: tokenRows } = await admin
    .from("user_push_tokens")
    .select("token")
    .eq("user_id", homeownerUserId)

  if (tokenRows?.length) {
    const tokens = tokenRows.map((r: any) => r.token)
    const { expired } = await sendWebPushToUser(tokens, {
      title:              `${applicantName} applied to your job`,
      body:               `Tap to review and confirm them for "${job.title}"`,
      url:                `/dashboard/homeowner/jobs/${jobId}`,
      tag:                `job-application-${jobId}`,
      requireInteraction: true,
    })
    if (expired.length) {
      await admin.from("user_push_tokens").delete().in("token", expired)
    }
    console.log("[URGENT-RESPONSES] Push sent to homeowner:", homeownerUserId)
  }
}
