import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

/**
 * DELETE /api/jobs/[id]
 *
 * Deletes a job using the admin client (bypasses RLS hang).
 * Verifies the caller owns the job before deleting.
 */
export async function DELETE(
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

    // Verify ownership via homeowner_profiles or company_profiles
    const { data: job } = await supabase
      .from("jobs")
      .select("id, homeowner_id, company_id")
      .eq("id", jobId)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    let isOwner = false

    if (job.homeowner_id) {
      const { data: hp } = await supabase
        .from("homeowner_profiles")
        .select("id")
        .eq("id", job.homeowner_id)
        .eq("user_id", user.id)
        .maybeSingle()
      if (hp) isOwner = true
    }

    if (!isOwner && job.company_id) {
      const { data: cp } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("id", job.company_id)
        .eq("user_id", user.id)
        .maybeSingle()
      if (cp) isOwner = true
    }

    if (!isOwner) {
      return NextResponse.json({ error: "Not authorized to delete this job" }, { status: 403 })
    }

    // Delete with admin client — bypasses all RLS so it never hangs
    const admin = createAdminClient()
    const { error: deleteError } = await admin
      .from("jobs")
      .delete()
      .eq("id", jobId)

    if (deleteError) {
      console.error("[DELETE /api/jobs/[id]] Error:", deleteError.message)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    revalidateTag(`jobs-user-${user.id}`)
    console.log("[DELETE /api/jobs/[id]] Deleted job:", jobId)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error("[DELETE /api/jobs/[id]] Unexpected error:", err)
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 })
  }
}
