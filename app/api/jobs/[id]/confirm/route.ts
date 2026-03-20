import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// POST /api/jobs/[id]/confirm
// Body: { company_id }  — company_profiles.id of the tradesperson to confirm
//
// Calls confirm_tradesperson RPC (SECURITY DEFINER) then sends
// the tradesperson a "Message now" push notification.
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

    const { company_id } = await request.json() as { company_id: string }
    if (!company_id) {
      return NextResponse.json({ error: "company_id required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify caller is the homeowner of this job
    const { data: job } = await admin
      .from("jobs")
      .select("status, title, homeowner_id, homeowner_profiles!homeowner_id(user_id)")
      .eq("id", jobId)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if ((job as any).homeowner_profiles?.user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }
    // Always look up the tradesperson's user_id so we can return a conversationId
    // regardless of whether this is a fresh confirm or a 409 (already confirmed).
    const { data: cp } = await admin
      .from("company_profiles")
      .select("user_id")
      .eq("id", company_id)
      .maybeSingle()

    // Get or create the conversation so the homeowner lands directly in the chat
    let conversationId: string | null = null
    if (cp?.user_id) {
      const { data: convId } = await supabase.rpc("get_or_create_conversation", {
        user1_id: user.id,
        user2_id: cp.user_id,
      })
      conversationId = convId ?? null
    }

    if ((job as any).status !== "POSTED") {
      // Job already confirmed — still return the conversationId so the UI can open the chat
      return NextResponse.json({ error: "already_confirmed", conversationId }, { status: 409 })
    }

    // Confirm via SECURITY DEFINER RPC (same as accept in applications route)
    const { error: rpcError } = await supabase.rpc("confirm_tradesperson", {
      p_job_id: jobId,
      p_tradesperson_id: company_id,
    })

    if (rpcError) {
      console.error("[CONFIRM] confirm_tradesperson error:", rpcError.message)
      return NextResponse.json({ error: rpcError.message }, { status: 422 })
    }

    // Notify tradesperson — fire and forget (pass conversationId so the link goes directly to the chat)
    notifyTradespersonSelected(jobId, company_id, (job as any).title, conversationId, admin).catch(console.error)

    return NextResponse.json({ success: true, conversationId })

  } catch (error) {
    console.error("[CONFIRM] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function notifyTradespersonSelected(
  jobId: string,
  companyId: string,
  jobTitle: string,
  conversationId: string | null,
  admin: ReturnType<typeof createAdminClient>
) {
  const { data: cp } = await admin
    .from("company_profiles")
    .select("user_id")
    .eq("id", companyId)
    .maybeSingle()

  if (!cp?.user_id) return

  // Link directly to the conversation if available, otherwise fall back to messages list
  const messageUrl = conversationId ? `/messages/${conversationId}` : `/messages`

  await admin.from("notifications").insert({
    user_id:    cp.user_id,
    type:       "job_accepted",
    title:      "Application accepted 🎉",
    message:    jobTitle,
    link_url:   messageUrl,
    action_url: messageUrl,
    is_read:    false,
  })
}
