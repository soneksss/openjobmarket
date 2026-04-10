import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

// POST /api/jobs/[id]/complete
// Marks a trade job as COMPLETED — homeowner only, any status except already COMPLETED.
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

    // Verify caller is the homeowner of this job
    const { data: job } = await admin
      .from("jobs")
      .select("status, homeowner_id, homeowner_profiles!homeowner_id(user_id)")
      .eq("id", jobId)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if ((job as any).homeowner_profiles?.user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }
    if ((job as any).status === "COMPLETED") {
      return NextResponse.json({ error: "Already completed" }, { status: 409 })
    }

    const { error: updateError } = await admin
      .from("jobs")
      .update({ status: "COMPLETED", matching_status: "closed" })
      .eq("id", jobId)

    if (updateError) {
      console.error("[COMPLETE] Update error:", updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    revalidateTag(`jobs-user-${user.id}`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[COMPLETE] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
