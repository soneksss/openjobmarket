import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// POST /api/messages
// Body: { recipient_id, content, job_id?, conversation_id? }
//
// Enforces the chat-unlock flow for UNCONFIRMED trade jobs:
//   Tradesperson first message  → upsert application, set first_message_at
//   Tradesperson second message → blocked until homeowner has replied (chat_unlocked = true)
//   Homeowner first reply       → sets chat_unlocked = true on the application
//
// Once a job is CONFIRMED (or any status beyond POSTED), the chat-unlock
// restriction is lifted — both sides can message freely.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recipient_id, content, job_id, conversation_id, sender_role, message_type, metadata, photo_urls } = body as {
      recipient_id: string
      content: string
      job_id?: string
      conversation_id?: string
      sender_role?: string
      message_type?: string
      metadata?: Record<string, unknown>
      photo_urls?: string[]
    }

    const hasPhotos = Array.isArray(photo_urls) && photo_urls.length > 0

    if (!recipient_id || (!content?.trim() && !hasPhotos)) {
      return NextResponse.json({ error: "recipient_id and content (or photos) are required" }, { status: 400 })
    }

    // ── Photo validation ──────────────────────────────────────────────────────
    if (hasPhotos) {
      if (photo_urls!.length > 3) {
        return NextResponse.json({ error: "Maximum 3 photos per message." }, { status: 400 })
      }

      // Per-job conversation limit (10 photos total)
      if (job_id) {
        const { data: jobCount } = await supabase
          .rpc("count_job_chat_photos", { p_job_id: job_id })
        if (((jobCount as number) ?? 0) + photo_urls!.length > 10) {
          return NextResponse.json(
            { error: "You reached the photo limit for this job (10 photos per conversation)." },
            { status: 429 }
          )
        }
      }

      // Per-user daily limit (50 photos per 24 h)
      const { data: dailyCount } = await supabase
        .rpc("count_user_daily_chat_photos", { p_user_id: user.id })
      if (((dailyCount as number) ?? 0) + photo_urls!.length > 50) {
        return NextResponse.json(
          { error: "Daily photo limit reached. You can send up to 50 photos per 24 hours." },
          { status: 429 }
        )
      }
    }

    // Get sender user type
    const { data: userData } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .single()

    const senderType = userData?.user_type ?? null
    const admin = createAdminClient()

    // ── Tradesperson sends a message ─────────────────────────────────────────
    if (senderType === "company" && job_id) {
      // Find the tradesperson's company profile
      const { data: cp } = await admin
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!cp?.id) {
        return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
      }

      // Check job status — confirmed jobs have no messaging restrictions
      const { data: jobRow } = await admin
        .from("jobs")
        .select("status")
        .eq("id", job_id)
        .maybeSingle()

      const jobConfirmed = jobRow?.status !== "POSTED"

      if (!jobConfirmed) {
        // Ensure application exists — create if tradesperson messages before using apply form
        // Ignore unique-violation (23505) — application may already exist from apply_to_job RPC
        await admin
          .from("job_applications")
          .insert({
            job_id,
            company_id: cp.id,
            tradesperson_id: cp.id,
            status: "PENDING",
          })
          .then(() => {}, () => {})

        // Read current application state
        const { data: app } = await admin
          .from("job_applications")
          .select("id, chat_unlocked, first_message_at")
          .eq("job_id", job_id)
          .eq("tradesperson_id", cp.id)
          .maybeSingle()

        if (app) {
          // Block second message if homeowner hasn't replied yet
          if (app.first_message_at && !app.chat_unlocked) {
            return NextResponse.json(
              { error: "Wait for the homeowner to reply before sending another message." },
              { status: 409 }
            )
          }

          // Mark first contact time
          if (!app.first_message_at) {
            await admin
              .from("job_applications")
              .update({ first_message_at: new Date().toISOString() })
              .eq("id", app.id)
          }
        }
      }
    }

    // ── Homeowner sends a reply ───────────────────────────────────────────────
    if (senderType === "homeowner" && job_id) {
      // Find recipient's company profile
      const { data: recipientCp } = await admin
        .from("company_profiles")
        .select("id")
        .eq("user_id", recipient_id)
        .maybeSingle()

      if (recipientCp?.id) {
        // Unlock chat for this tradesperson on this job (no-op if already unlocked or job confirmed)
        await admin
          .from("job_applications")
          .update({ chat_unlocked: true })
          .eq("job_id", job_id)
          .eq("tradesperson_id", recipientCp.id)
          .eq("chat_unlocked", false)
      }
    }

    // ── Homeowner first message → notify tradesperson with "Message now" ─────
    if (senderType === "homeowner" && job_id) {
      notifyTradespersonMessageReceived(recipient_id, user.id, job_id, admin).catch(console.error)
    }

    // ── Insert the message ────────────────────────────────────────────────────
    const { data: message, error: msgError } = await admin
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id,
        content: content?.trim() || "",
        subject: "New Message",
        conversation_id: conversation_id ?? null,
        message_type: message_type ?? "direct",
        job_id: job_id ?? null,
        sender_role: sender_role ?? senderType ?? null,
        metadata: metadata ?? null,
        photo_urls: hasPhotos ? photo_urls : [],
        is_read: false,
        share_personal_info: false,
      })
      .select()
      .single()

    if (msgError) {
      console.error("[MESSAGES POST] Insert error:", msgError.message)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message })

  } catch (error) {
    console.error("[MESSAGES POST] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Notify tradesperson when homeowner sends them a message — "Message now" deep link
async function notifyTradespersonMessageReceived(
  recipientUserId: string,
  senderUserId: string,
  jobId: string,
  admin: ReturnType<typeof createAdminClient>
) {
  const { data: job } = await admin
    .from("jobs")
    .select("title")
    .eq("id", jobId)
    .maybeSingle()

  if (!job) return

  const messageUrl = `/messages/new?recipient=${senderUserId}&jobId=${jobId}`

  // Only insert if there isn't already a recent "new_message" notification for this thread
  // (avoids spam on every reply — one notification per job per homeowner-tradesperson pair)
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", recipientUserId)
    .eq("type", "new_message")
    .eq("action_url", messageUrl)
    .eq("is_read", false)
    .limit(1)
    .maybeSingle()

  if (existing) return // already has an unread notification for this thread

  await admin.from("notifications").insert({
    user_id:    recipientUserId,
    type:       "new_message",
    title:      "Homeowner messaged you",
    message:    `You have a new message about "${job.title}". Tap to reply.`,
    link_url:   messageUrl,
    action_url: messageUrl,
    is_read:    false,
  })
}
