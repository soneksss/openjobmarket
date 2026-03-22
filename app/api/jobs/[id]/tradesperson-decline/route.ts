import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// POST /api/jobs/[id]/tradesperson-decline
// Body: { application_id }
//
// Called when the tradesperson clicks "Decline" on the confirmed-job notification.
// Sets their application to AUTO_CANCELLED and reverts the job to POSTED so
// the homeowner can choose a different tradesperson.
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

    const { application_id } = await request.json() as { application_id: string }
    if (!application_id) {
      return NextResponse.json({ error: "application_id required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the application belongs to this user
    const { data: app } = await admin
      .from("job_applications")
      .select("id, job_id, status, company_profiles!company_id(user_id)")
      .eq("id", application_id)
      .eq("job_id", jobId)
      .maybeSingle()

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const appUserid = (app as any).company_profiles?.user_id
    if (appUserid !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    if ((app as any).status !== "CONFIRMED") {
      return NextResponse.json({ error: "Application is not in CONFIRMED state" }, { status: 409 })
    }

    // Cancel the application and revert job to POSTED in a single transaction via admin
    const [appResult, jobResult] = await Promise.all([
      admin
        .from("job_applications")
        .update({ status: "AUTO_CANCELLED" })
        .eq("id", application_id),
      admin
        .from("jobs")
        .update({ status: "POSTED", confirmed_tradesperson_id: null, confirmed_at: null })
        .eq("id", jobId)
        .eq("status", "CONFIRMED"),
    ])

    if (appResult.error) {
      console.error("[TRADESPERSON-DECLINE] app update error:", appResult.error.message)
      return NextResponse.json({ error: appResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[TRADESPERSON-DECLINE] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
