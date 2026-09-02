import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

// POST /api/jobs/[id]/cancel-confirmation
// Homeowner undoes a tradesperson confirmation → job back to POSTED / searching.
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

    const { error } = await supabase.rpc("cancel_tradesperson_confirmation", { p_job_id: jobId })
    if (error) {
      console.error("[CANCEL-CONFIRMATION]", error.message)
      const status = error.message?.includes("not the homeowner") ? 403
        : error.message?.includes("not in CONFIRMED") ? 409
        : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    revalidateTag(`jobs-user-${user.id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CANCEL-CONFIRMATION] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
