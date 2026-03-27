import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// Safe empty response — never triggers a 500 in the frontend poll
const EMPTY_OK = { success: true, responses: [], notifiedCount: 0, searchRadius: null, jobState: null, applicationCount: 0 }

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
      .select("id, urgency_type, search_radius_miles, homeowner_id, company_id, job_state")
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

    // Fetch active applications from tradespeople — PENDING and ACCEPTED only
    // ("waiting_optional" is NOT a valid application_status enum value — never use it here)
    const { data: applications, error: appsError } = await adminClient
      .from("job_applications")
      .select(`
        id, status, applied_at, company_id, cover_letter,
        company_profiles!company_id (
          id, user_id, company_name, logo_url, location, latitude, longitude
        )
      `)
      .eq("job_id", jobId)
      .not("company_id", "is", null)
      .in("status", ["PENDING"])
      .order("applied_at", { ascending: false })

    if (appsError) {
      console.error("[URGENT-RESPONSES GET] job_applications query error:", appsError.message, appsError)
    }

    // Notified count
    let notifiedCount = 0
    try {
      const { count } = await adminClient
        .from("urgent_job_dispatch_alerts")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jobId)
      notifiedCount = count ?? 0
    } catch {}

    const responses = (applications ?? [])
      .map((app: any) => {
        const p = app.company_profiles
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
    try {
      const adm = createAdminClient()
      await adm.rpc("advance_job_state", { p_job_id: jobId })
    } catch {}

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
    console.log("[URGENT-RESPONSES] Homeowner notified:", homeownerUserId)
  }
}
