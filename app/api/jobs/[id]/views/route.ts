import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    // Use admin client so the UPDATE is never blocked by RLS
    const admin = createAdminClient()

    // Verify job exists + get owner IDs
    const { data: job, error: fetchError } = await admin
      .from("jobs")
      .select("id, views_count, company_id, homeowner_id")
      .eq("id", jobId)
      .maybeSingle()

    if (fetchError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Don't count views from the job owner
    if (user) {
      if (job.company_id) {
        const { data: cp } = await admin
          .from("company_profiles")
          .select("user_id")
          .eq("id", job.company_id)
          .maybeSingle()
        if (cp?.user_id === user.id) {
          return NextResponse.json({ success: true, views_count: job.views_count ?? 0, skipped: true })
        }
      }
      if (job.homeowner_id) {
        const { data: hp } = await admin
          .from("homeowner_profiles")
          .select("user_id")
          .eq("id", job.homeowner_id)
          .maybeSingle()
        if (hp?.user_id === user.id) {
          return NextResponse.json({ success: true, views_count: job.views_count ?? 0, skipped: true })
        }
      }
    }

    // Atomic increment via admin client (bypasses RLS that would block a viewer updating the job)
    const { data: updated, error: updateError } = await admin
      .from("jobs")
      .update({ views_count: (job.views_count ?? 0) + 1 })
      .eq("id", jobId)
      .select("views_count")
      .maybeSingle()

    if (updateError) {
      console.error("[JOB-VIEWS] Update error:", updateError.message)
      return NextResponse.json({ error: "Failed to update views" }, { status: 500 })
    }

    return NextResponse.json({ success: true, views_count: updated?.views_count ?? (job.views_count ?? 0) + 1 })
  } catch (error) {
    console.error("[JOB-VIEWS] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
