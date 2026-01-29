import { createClient } from "@/lib/server"
import { sendEmail, shouldSendEmailNotification, logNotification } from "@/lib/email/service"
import { jobApplicationEmail } from "@/lib/email/templates"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/notifications/send-application-notification
 * Sends email notification when someone applies to a job posting
 *
 * Body:
 * {
 *   jobPosterId: string,    // User who posted the job (recipient of notification)
 *   applicantId: string,    // User who applied
 *   jobId: string,
 *   jobTitle: string,
 *   applicationId: string,
 *   applicationMessage?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobPosterId, applicantId, jobId, jobTitle, applicationId, applicationMessage } = body

    if (!jobPosterId || !applicantId || !jobId || !jobTitle || !applicationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if job poster wants email notifications for applications
    const shouldSend = await shouldSendEmailNotification(supabase, jobPosterId, "job_application")

    if (!shouldSend) {
      console.log("[NOTIFICATION] User has disabled application notifications:", jobPosterId)
      return NextResponse.json({ success: true, sent: false, reason: "User preferences" })
    }

    // Get job poster user data
    const { data: posterUser, error: posterError } = await supabase
      .from("users")
      .select("email, user_type")
      .eq("id", jobPosterId)
      .single()

    if (posterError || !posterUser) {
      console.error("[NOTIFICATION] Failed to fetch job poster:", posterError)
      return NextResponse.json({ error: "Job poster not found" }, { status: 404 })
    }

    // Get poster name from profile
    let posterName = "there"
    if (posterUser.user_type === "professional") {
      const { data: profile } = await supabase
        .from("professional_profiles")
        .select("first_name, last_name")
        .eq("user_id", jobPosterId)
        .maybeSingle()

      if (profile) {
        posterName = `${profile.first_name} ${profile.last_name}`.trim()
      }
    } else if (posterUser.user_type === "company") {
      const { data: profile } = await supabase
        .from("company_profiles")
        .select("company_name")
        .eq("user_id", jobPosterId)
        .maybeSingle()

      if (profile) {
        posterName = profile.company_name
      }
    }

    // Get applicant name
    const { data: applicantUser } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", applicantId)
      .single()

    let applicantName = "Someone"
    if (applicantUser) {
      if (applicantUser.user_type === "professional") {
        const { data: profile } = await supabase
          .from("professional_profiles")
          .select("first_name, last_name")
          .eq("user_id", applicantId)
          .maybeSingle()

        if (profile) {
          applicantName = `${profile.first_name} ${profile.last_name}`.trim()
        }
      } else if (applicantUser.user_type === "company") {
        const { data: profile } = await supabase
          .from("company_profiles")
          .select("company_name")
          .eq("user_id", applicantId)
          .maybeSingle()

        if (profile) {
          applicantName = profile.company_name
        }
      }
    }

    // Create application message preview if provided
    let messagePreview: string | undefined
    if (applicationMessage) {
      messagePreview = applicationMessage.length > 150
        ? applicationMessage.substring(0, 150) + "..."
        : applicationMessage
    }

    // Build URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
    const applicationUrl = `${baseUrl}/dashboard/applications/${applicationId}`
    const settingsUrl = `${baseUrl}/dashboard/settings#notifications`

    // Generate email content
    const { html, text } = jobApplicationEmail({
      recipientName: posterName,
      applicantName,
      jobTitle,
      applicationMessage: messagePreview,
      applicationUrl,
      settingsUrl,
    })

    // Send email
    const result = await sendEmail({
      to: posterUser.email,
      subject: `New application for ${jobTitle}`,
      html,
      text,
    })

    // Log the notification
    await logNotification(
      supabase,
      jobPosterId,
      "job_application",
      posterUser.email,
      `New application for ${jobTitle}`,
      result.success ? "sent" : "failed",
      result.error,
      {
        applicant_id: applicantId,
        job_id: jobId,
        application_id: applicationId,
        job_title: jobTitle,
      }
    )

    if (!result.success) {
      console.error("[NOTIFICATION] Failed to send email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    console.log("[NOTIFICATION] Application email sent successfully to:", posterUser.email)
    return NextResponse.json({ success: true, sent: true, messageId: result.messageId })

  } catch (error) {
    console.error("[NOTIFICATION] Error in send-application-notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
