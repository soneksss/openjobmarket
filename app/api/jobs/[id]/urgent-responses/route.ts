import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// Safe empty response — never triggers a 500 in the frontend poll
const EMPTY_OK = { success: true, responses: [], notifiedCount: 0, searchRadius: null }

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

    // Fetch job — intentionally omit `search_state` which may not exist yet
    const { data: job } = await supabase
      .from("jobs")
      .select("id, urgency_type, search_radius_miles, homeowner_id, company_id")
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

    // Fetch PENDING applications from tradespeople (company accounts)
    const { data: applications } = await supabase
      .from("job_applications")
      .select(`
        id, status, created_at, company_id,
        company_profiles (
          id, user_id, company_name, logo_url, location, verified
        )
      `)
      .eq("job_id", jobId)
      .not("company_id", "is", null)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })

    // Notified count — must use admin client because urgent_job_dispatch_alerts
    // has no RLS SELECT policy for authenticated users (service_role only).
    let notifiedCount = 0
    try {
      const admin = createAdminClient()
      const { count } = await admin
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
          verified:       p.verified || false,
          phone:          null,
          type:           "company",
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success:      true,
      responses,
      notifiedCount,
      searchRadius: job.search_radius_miles,
    })

  } catch (error) {
    // Never return 500 — infinite polling would break FindingTradesView
    console.error("[URGENT-RESPONSES GET] Error (returning empty):", error)
    return NextResponse.json(EMPTY_OK)
  }
}

// POST - Tradesperson applies to an urgent job
export async function POST(
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

    return NextResponse.json({ success: true, message: "Response submitted successfully" })

  } catch (error) {
    console.error("[URGENT-RESPONSES POST] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
