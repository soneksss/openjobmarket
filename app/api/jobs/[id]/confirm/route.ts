import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

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

    revalidateTag(`jobs-user-${user.id}`)
    // Notify tradesperson — fire and forget (pass conversationId so the link goes directly to the chat)
    notifyTradespersonSelected(jobId, company_id, job as any, conversationId, admin).catch(console.error)

    return NextResponse.json({ success: true, conversationId })

  } catch (error) {
    console.error("[CONFIRM] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function formatBudgetStr(min: number | null, max: number | null, period: string | null): string | null {
  if (!min && !max) return null
  const p = period === "hourly" ? "/hr" : period === "daily" ? "/day" : period === "weekly" ? "/wk" : ""
  if (min && max && min !== max) return `£${min}–£${max}${p}`
  if (min && max && min === max) return `£${min}${p}`
  if (min) return `£${min}+${p}`
  return `Up to £${max}${p}`
}

async function notifyTradespersonSelected(
  jobId: string,
  companyId: string,
  job: { title: string; budget_min?: number | null; budget_max?: number | null; budget_period?: string | null; location?: string | null },
  conversationId: string | null,
  admin: ReturnType<typeof createAdminClient>
) {
  const [{ data: cp }, { data: appData }] = await Promise.all([
    admin.from("company_profiles").select("user_id").eq("id", companyId).maybeSingle(),
    admin.from("job_applications").select("id").eq("job_id", jobId).eq("company_id", companyId).maybeSingle(),
  ])

  if (!cp?.user_id) return

  const budget  = formatBudgetStr(job.budget_min ?? null, job.budget_max ?? null, job.budget_period ?? null)
  const jobUrl  = `/jobs/${jobId}`
  const msgUrl  = conversationId ? `/messages/${conversationId}` : `/messages`

  await admin.from("notifications").insert({
    user_id:    cp.user_id,
    type:       "job_accepted",
    title:      job.title,
    message:    "Review details and arrange a visit",
    link_url:   jobUrl,
    action_url: jobUrl,
    is_read:    false,
    data: {
      job_id:          jobId,
      job_title:       job.title,
      budget:          budget,
      location:        job.location ?? null,
      conversation_id: conversationId,
      message_url:     msgUrl,
      application_id:  appData?.id ?? null,
    },
  })
}
