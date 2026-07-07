import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { sendWebPushToUser } from "@/lib/web-push"

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
      .select("status, title, budget_min, budget_max, budget_period, location, homeowner_id, homeowner_profiles!homeowner_id(user_id)")
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

    // Get or create the conversation so the homeowner lands directly in the chat.
    // Use admin client + all 4 params to avoid "ambiguous overload" and GRANT issues.
    let conversationId: string | null = null
    if (cp?.user_id) {
      const { data: convId, error: convErr } = await admin.rpc("get_or_create_conversation", {
        user1_id:  user.id,
        user2_id:  cp.user_id,
        p_job_id:  jobId,
        p_subject: null,
      })
      if (convErr) {
        console.error("[CONFIRM] get_or_create_conversation error:", convErr.message)
      }
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

    // Mark job inactive so it disappears from map/listings and stops dispatch
    await admin
      .from("jobs")
      .update({ is_active: false, dispatch_state: "completed" })
      .eq("id", jobId)

    revalidateTag(`jobs-user-${user.id}`)

    // Fire-and-forget — notify cancelled applicants and dispatched-but-not-applied trades
    notifyFilledJob(jobId, job.title, admin).catch((err) =>
      console.error("[CONFIRM] notifyFilledJob error:", err)
    )

    return NextResponse.json({ success: true, conversationId })

  } catch (error) {
    console.error("[CONFIRM] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Send "job filled" push to every tradesperson whose application was AUTO_CANCELLED
// and every tradesperson dispatched but who never applied (responded=false in alerts).
async function notifyFilledJob(jobId: string, jobTitle: string, admin: ReturnType<typeof createAdminClient>) {
  const pushBody = `Sorry, "${jobTitle}" has now been assigned to another tradesperson.`
  const tag      = `job-filled-${jobId}`

  // 1. Collect user_ids from AUTO_CANCELLED applications
  const { data: cancelledApps } = await admin
    .from("job_applications")
    .select("company_id")
    .eq("job_id", jobId)
    .eq("status", "AUTO_CANCELLED")

  const cancelledCompanyIds = (cancelledApps ?? []).map((a: any) => a.company_id).filter(Boolean)

  // 2. Collect company_ids from dispatched-but-not-responded alerts
  const { data: unrespondedAlerts } = await admin
    .from("urgent_job_dispatch_alerts")
    .select("company_id")
    .eq("job_id", jobId)
    .eq("responded", false)

  const unrespondedCompanyIds = (unrespondedAlerts ?? []).map((a: any) => a.company_id).filter(Boolean)

  // Deduplicate all company_ids to notify
  const allCompanyIds = [...new Set([...cancelledCompanyIds, ...unrespondedCompanyIds])]
  if (allCompanyIds.length === 0) return

  // 3. Resolve user_ids from company_ids
  const { data: profiles } = await admin
    .from("company_profiles")
    .select("id, user_id")
    .in("id", allCompanyIds)

  const userIds = (profiles ?? []).map((p: any) => p.user_id).filter(Boolean)
  if (userIds.length === 0) return

  // 4. Fetch push tokens for all those users in one query
  const { data: tokenRows } = await admin
    .from("user_push_tokens")
    .select("user_id, token")
    .in("user_id", userIds)

  if (!tokenRows?.length) return

  const tokens = tokenRows.map((r: any) => r.token)
  const { expired } = await sendWebPushToUser(tokens, {
    title: "Job has been filled",
    body:  pushBody,
    url:   `/jobs/${jobId}`,
    tag,
  })

  if (expired.length) {
    await admin.from("user_push_tokens").delete().in("token", expired)
  }

  console.log(`[CONFIRM] Notified ${userIds.length} trade(s) that job ${jobId} was filled`)
}

