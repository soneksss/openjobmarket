import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

// PATCH /api/jobs/[id]/applications/[appId]
// Body: { action: 'accept', tradesperson_id: string } | { action: 'decline' }
//
// accept  → calls confirm_tradesperson RPC (sets job CONFIRMED, cancels others)
// decline → sets application status to AUTO_CANCELLED
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    const { id: jobId, appId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, tradesperson_id } = body as { action: string; tradesperson_id?: string }

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 })
    }

    // Verify user is the homeowner of this job AND check job status
    const admin = createAdminClient()
    const { data: job } = await admin
      .from("jobs")
      .select("status, title, budget_min, budget_max, budget_period, location, homeowner_id, homeowner_profiles!homeowner_id(user_id)")
      .eq("id", jobId)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const homeownerUserId = (job as any).homeowner_profiles?.user_id
    if (homeownerUserId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    if (action === "accept") {
      // Guard: job must still be POSTED — reject if already confirmed
      if ((job as any).status !== "POSTED") {
        return NextResponse.json(
          { error: "Job already confirmed — cannot accept another application" },
          { status: 409 }
        )
      }
      if (!tradesperson_id) {
        return NextResponse.json({ error: "tradesperson_id required for accept" }, { status: 400 })
      }

      // confirm_tradesperson is SECURITY DEFINER — call it as the homeowner
      const { error: rpcError } = await supabase.rpc("confirm_tradesperson", {
        p_job_id: jobId,
        p_tradesperson_id: tradesperson_id,
      })

      if (rpcError) {
        console.error("[APP-ACTION] confirm_tradesperson error:", rpcError.message)
        return NextResponse.json({ error: rpcError.message }, { status: 422 })
      }

      revalidateTag(`jobs-user-${user.id}`)

      return NextResponse.json({ success: true, action: "accepted" })
    }

    // action === "decline"
    const { error: updateError } = await admin
      .from("job_applications")
      .update({ status: "AUTO_CANCELLED" })
      .eq("id", appId)
      .eq("job_id", jobId)

    if (updateError) {
      console.error("[APP-ACTION] decline update error:", updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: "declined" })

  } catch (error) {
    console.error("[APP-ACTION] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

