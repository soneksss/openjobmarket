import { createClient, createAdminClient } from "@/lib/server"
import { sendEmail, shouldSendEmailNotification, logNotification } from "@/lib/email/service"
import { newMessageEmail } from "@/lib/email/templates"
import { sendWebPushToUser } from "@/lib/web-push"
import { sendFcmToTokens } from "@/lib/firebase-admin"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/notifications/send-message-notification
 * Sends email notification when a user receives a new message
 *
 * Body:
 * {
 *   recipientId: string,
 *   senderId: string,
 *   conversationId: string,
 *   messageSubject: string,
 *   messageContent: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientId, senderId, conversationId, messageSubject, messageContent } = body

    if (!recipientId || !senderId || !conversationId || !messageSubject || !messageContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use admin client for system-level operations (inserting notifications for other users)
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (e) {
      console.warn("[NOTIFICATION] Admin client not available, using regular client for notifications")
      adminClient = supabase
    }

    // Get recipient user data
    const { data: recipientUser, error: recipientError } = await supabase
      .from("users")
      .select("email, user_type")
      .eq("id", recipientId)
      .single()

    if (recipientError || !recipientUser) {
      console.error("[NOTIFICATION] Failed to fetch recipient user:", recipientError)
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    // Get recipient name from profile
    let recipientName = "there"
    if (recipientUser.user_type === "professional") {
      const { data: profile } = await supabase
        .from("professional_profiles")
        .select("first_name, last_name")
        .eq("user_id", recipientId)
        .maybeSingle()

      if (profile) {
        recipientName = `${profile.first_name} ${profile.last_name}`.trim()
      }
    } else if (recipientUser.user_type === "company") {
      const { data: profile } = await supabase
        .from("company_profiles")
        .select("company_name")
        .eq("user_id", recipientId)
        .maybeSingle()

      if (profile) {
        recipientName = profile.company_name
      }
    } else if (recipientUser.user_type === "homeowner") {
      const { data: profile } = await supabase
        .from("homeowner_profiles")
        .select("first_name, last_name")
        .eq("user_id", recipientId)
        .maybeSingle()

      if (profile) {
        recipientName = `${profile.first_name} ${profile.last_name}`.trim()
      }
    } else if (recipientUser.user_type === "contractor") {
      const { data: profile } = await supabase
        .from("contractor_profiles")
        .select("company_name")
        .eq("user_id", recipientId)
        .maybeSingle()

      if (profile) {
        recipientName = profile.company_name
      }
    }

    // Get sender name
    const { data: senderUser } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", senderId)
      .single()

    let senderName = "Someone"
    if (senderUser) {
      if (senderUser.user_type === "professional") {
        const { data: profile } = await supabase
          .from("professional_profiles")
          .select("first_name, last_name")
          .eq("user_id", senderId)
          .maybeSingle()

        if (profile) {
          senderName = `${profile.first_name} ${profile.last_name}`.trim()
        }
      } else if (senderUser.user_type === "company") {
        const { data: profile } = await supabase
          .from("company_profiles")
          .select("company_name")
          .eq("user_id", senderId)
          .maybeSingle()

        if (profile) {
          senderName = profile.company_name
        }
      } else if (senderUser.user_type === "homeowner") {
        const { data: profile } = await supabase
          .from("homeowner_profiles")
          .select("first_name, last_name")
          .eq("user_id", senderId)
          .maybeSingle()

        if (profile) {
          senderName = `${profile.first_name} ${profile.last_name}`.trim()
        }
      } else if (senderUser.user_type === "contractor") {
        const { data: profile } = await supabase
          .from("contractor_profiles")
          .select("company_name")
          .eq("user_id", senderId)
          .maybeSingle()

        if (profile) {
          senderName = profile.company_name
        }
      }
    }

    // Create message preview (first 150 characters)
    const messagePreview = messageContent.length > 150
      ? messageContent.substring(0, 150) + "..."
      : messageContent

    // Build URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
    const conversationUrl = `${baseUrl}/messages/${conversationId}`
    const settingsUrl = `${baseUrl}/dashboard/settings#notifications`

    // ALWAYS create in-app notification for the bell icon (regardless of email preferences)
    // Use admin client to bypass RLS since we're inserting for another user
    const { error: inAppNotifError } = await adminClient
      .from("notifications")
      .insert({
        user_id: recipientId,
        type: "new_message",
        title: `New message from ${senderName}`,
        message: messagePreview,
        link_url: conversationUrl,
        is_read: false,
      })

    if (inAppNotifError) {
      console.error("[NOTIFICATION] Failed to create in-app notification:", inAppNotifError)
    } else {
      console.log("[NOTIFICATION] In-app notification created for user:", recipientId)
    }

    // Push to recipient — web + FCM (fire-and-forget, non-blocking)
    ;(async () => {
      try {
        const { data: tokenRows } = await adminClient
          .from("user_push_tokens")
          .select("token, device_type")
          .eq("user_id", recipientId)

        const pushTitle = `New message from ${senderName}`
        const pushBody  = messagePreview

        const webTokens = (tokenRows ?? [])
          .filter((r: any) => r.device_type === "web")
          .map((r: any) => r.token as string)

        const fcmTokens = (tokenRows ?? [])
          .filter((r: any) => r.device_type === "fcm")
          .map((r: any) => r.token as string)

        if (webTokens.length > 0) {
          const { expired } = await sendWebPushToUser(webTokens, {
            title: pushTitle,
            body:  pushBody,
            url:   conversationUrl,
            tag:   `message-${conversationId}`,
          })
          if (expired.length > 0) {
            await adminClient.from("user_push_tokens").delete().in("token", expired)
          }
        }

        if (fcmTokens.length > 0) {
          const { failed } = await sendFcmToTokens(fcmTokens, {
            title: pushTitle,
            body:  pushBody,
            url:   conversationUrl,
            tag:   `message-${conversationId}`,
          })
          if (failed.length > 0) {
            await adminClient.from("user_push_tokens").delete().in("token", failed)
          }
        }

        console.log(`[NOTIFICATION] Push sent to ${recipientId} web=${webTokens.length} fcm=${fcmTokens.length}`)
      } catch (pushErr: any) {
        console.warn("[NOTIFICATION] Push failed:", pushErr?.message)
      }
    })()

    // Check if recipient wants email notifications for messages
    const shouldSend = await shouldSendEmailNotification(supabase, recipientId, "new_message")

    if (!shouldSend) {
      console.log("[NOTIFICATION] User has disabled email notifications for messages:", recipientId)
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "Email disabled by user preferences",
        inAppNotificationCreated: !inAppNotifError
      })
    }

    // Generate email content
    const { html, text } = newMessageEmail({
      recipientName,
      senderName,
      messageSubject,
      messagePreview,
      conversationUrl,
      settingsUrl,
    })

    // Send email
    const result = await sendEmail({
      to: recipientUser.email,
      subject: `New message from ${senderName}`,
      html,
      text,
    })

    // Log the notification (use admin client to bypass RLS)
    await logNotification(
      adminClient,
      recipientId,
      "new_message",
      recipientUser.email,
      `New message from ${senderName}`,
      result.success ? "sent" : "failed",
      result.error,
      {
        sender_id: senderId,
        conversation_id: conversationId,
        message_subject: messageSubject,
      }
    )

    if (!result.success) {
      console.error("[NOTIFICATION] Failed to send email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error, inAppNotificationCreated: !inAppNotifError },
        { status: 500 }
      )
    }

    console.log("[NOTIFICATION] Email sent successfully to:", recipientUser.email)
    return NextResponse.json({
      success: true,
      sent: true,
      messageId: result.messageId,
      inAppNotificationCreated: !inAppNotifError
    })

  } catch (error) {
    console.error("[NOTIFICATION] Error in send-message-notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
