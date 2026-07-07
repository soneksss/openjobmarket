import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

// POST /api/jobs/[id]/tradesperson-complete
// Tradesperson marks a job as completed.
// Verifies caller is the confirmed tradesperson, updates status, notifies homeowner.
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

    const admin = createAdminClient()

    // Get caller's company profile
    const { data: callerProfile } = await admin
      .from("company_profiles")
      .select("id, company_name")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!callerProfile) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 403 })
    }

    // Fetch job and verify caller is the confirmed tradesperson
    const { data: job } = await admin
      .from("jobs")
      .select(`
        id, title, status, confirmed_tradesperson_id,
        homeowner_profiles!homeowner_id ( user_id, first_name, last_name )
      `)
      .eq("id", jobId)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (job.confirmed_tradesperson_id !== callerProfile.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    if (job.status === "COMPLETED") {
      return NextResponse.json({ error: "already_completed" }, { status: 409 })
    }

    if (job.status !== "CONFIRMED" && job.status !== "ACTIVE") {
      return NextResponse.json({ error: "Job cannot be marked as completed in current status" }, { status: 422 })
    }

    // Single-step: CONFIRMED or ACTIVE → COMPLETED.
    // migration 20260317000004 added CONFIRMED→COMPLETED as a valid transition.
    const { error: updateError } = await admin
      .from("jobs")
      .update({ status: "COMPLETED", is_active: false, completed_at: new Date().toISOString() })
      .eq("id", jobId)
      .in("status", ["CONFIRMED", "ACTIVE"])

    if (updateError) {
      console.error("[TRADESPERSON-COMPLETE] ACTIVE→COMPLETED error:", updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 422 })
    }

    const homeowner = (job as any).homeowner_profiles
    if (homeowner?.user_id) {
      revalidateTag(`jobs-user-${homeowner.user_id}`)

      // Notify homeowner — fire and forget
      admin.from("notifications").insert({
        user_id: homeowner.user_id,
        type: "job_completed_by_tradesperson",
        title: job.title,
        message: `Tradesperson ${callerProfile.company_name} marked the job ${job.title} as completed`,
        link_url: `/jobs/${jobId}`,
        action_url: `/dashboard/homeowner/jobs`,
        is_read: false,
        data: {
          job_id: jobId,
          job_title: job.title,
          company_name: callerProfile.company_name,
        },
      }).then(({ error }) => {
        if (error) console.error("[TRADESPERSON-COMPLETE] Notification error:", error.message)
      })
    }

    // Revalidate tradesperson's own cache (homeowner's already done above)
    revalidateTag(`jobs-user-${user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[TRADESPERSON-COMPLETE] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
