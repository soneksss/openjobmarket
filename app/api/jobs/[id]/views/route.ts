import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    // Get the current user (optional - views can be tracked for anonymous users too)
    const { data: { user } } = await supabase.auth.getUser()

    // Get the job to verify it exists and get current views_count
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select("id, views_count, company_id, homeowner_id")
      .eq("id", jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    // Don't count view if the viewer is the job owner
    if (user) {
      // Check if user is the company owner
      if (job.company_id) {
        const { data: companyProfile } = await supabase
          .from("company_profiles")
          .select("user_id")
          .eq("id", job.company_id)
          .single()

        if (companyProfile?.user_id === user.id) {
          return NextResponse.json({
            success: true,
            views_count: job.views_count || 0,
            skipped: true,
            reason: "owner_view"
          })
        }
      }

      // Check if user is the homeowner owner
      if (job.homeowner_id) {
        const { data: homeownerProfile } = await supabase
          .from("homeowner_profiles")
          .select("user_id")
          .eq("id", job.homeowner_id)
          .single()

        if (homeownerProfile?.user_id === user.id) {
          return NextResponse.json({
            success: true,
            views_count: job.views_count || 0,
            skipped: true,
            reason: "owner_view"
          })
        }
      }
    }

    // Increment the views_count
    const newViewsCount = (job.views_count || 0) + 1

    const { error: updateError } = await supabase
      .from("jobs")
      .update({ views_count: newViewsCount })
      .eq("id", jobId)

    if (updateError) {
      console.error("[JOB-VIEWS] Error updating views count:", updateError)
      return NextResponse.json(
        { error: "Failed to update views count" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      views_count: newViewsCount
    })
  } catch (error) {
    console.error("[JOB-VIEWS] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
