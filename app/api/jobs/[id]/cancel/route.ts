import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminWriteClient } from "@/lib/server"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify ownership
  const { data: job } = await supabase
    .from("jobs")
    .select("id, homeowner_id, company_id")
    .eq("id", jobId)
    .maybeSingle()

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let isOwner = false
  if (job.homeowner_id) {
    const { data: hp } = await supabase.from("homeowner_profiles").select("user_id").eq("id", job.homeowner_id).maybeSingle()
    if (hp?.user_id === user.id) isOwner = true
  }
  if (!isOwner && job.company_id) {
    const { data: cp } = await supabase.from("company_profiles").select("user_id").eq("id", job.company_id).maybeSingle()
    if (cp?.user_id === user.id) isOwner = true
  }
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Use admin write client to bypass the state-machine trigger
  const admin = createAdminWriteClient()
  const { error } = await admin
    .from("jobs")
    .update({
      is_active:       false,
      status:          "CANCELLED",
      matching_status: "stopped",
      search_state:    null,
    })
    .eq("id", jobId)

  if (error) {
    console.error("[CANCEL JOB]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
