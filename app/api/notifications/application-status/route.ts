import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

// Force Node.js runtime
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log("[APPLICATION-STATUS-EMAIL] Processing email notification request...")

    const body = await request.json()
    const { applicantEmail, applicantName, jobTitle, status } = body

    console.log("[APPLICATION-STATUS-EMAIL] Request details:", {
      applicantEmail,
      applicantName,
      jobTitle,
      status,
    })

    if (!applicantEmail || !jobTitle || !status) {
      console.log("[APPLICATION-STATUS-EMAIL] Missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: applicantEmail, jobTitle, status" },
        { status: 400 }
      )
    }

    // Check if email notifications are enabled for this user
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, email_notifications_enabled")
      .eq("email", applicantEmail)
      .maybeSingle()

    if (userError) {
      console.error("[APPLICATION-STATUS-EMAIL] Error fetching user:", userError)
    }

    // Skip if user has disabled email notifications
    if (userData && userData.email_notifications_enabled === false) {
      console.log("[APPLICATION-STATUS-EMAIL] User has disabled email notifications")
      return NextResponse.json({
        success: true,
        message: "Email notifications disabled for this user",
      })
    }

    // Prepare email content based on status
    let emailSubject = ""
    let emailMessage = ""

    switch (status) {
      case "accepted":
        emailSubject = `Congratulations! Your application has been accepted`
        emailMessage = `Dear ${applicantName || "Applicant"},\n\nGreat news! Your application for the position "${jobTitle}" has been accepted.\n\nThe employer will be in touch with you soon regarding next steps.\n\nBest regards,\nThe Job Market Team`
        break
      case "interview":
        emailSubject = `Interview Invitation for ${jobTitle}`
        emailMessage = `Dear ${applicantName || "Applicant"},\n\nWe're pleased to inform you that you've been selected for an interview for the position "${jobTitle}".\n\nThe employer will contact you shortly to schedule the interview.\n\nBest regards,\nThe Job Market Team`
        break
      case "rejected":
        emailSubject = `Application Update for ${jobTitle}`
        emailMessage = `Dear ${applicantName || "Applicant"},\n\nThank you for your interest in the position "${jobTitle}".\n\nAfter careful consideration, we have decided to move forward with other candidates at this time. We appreciate the time you took to apply and wish you success in your job search.\n\nBest regards,\nThe Job Market Team`
        break
      default:
        emailSubject = `Application Status Update for ${jobTitle}`
        emailMessage = `Dear ${applicantName || "Applicant"},\n\nYour application status for the position "${jobTitle}" has been updated to "${status}".\n\nYou can view your application details in your dashboard.\n\nBest regards,\nThe Job Market Team`
    }

    console.log("[APPLICATION-STATUS-EMAIL] Email content prepared:", {
      subject: emailSubject,
      recipient: applicantEmail,
    })

    // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
    // For now, we'll log the email and consider it sent
    // Example integration:
    // const emailService = await sendEmail({
    //   to: applicantEmail,
    //   subject: emailSubject,
    //   text: emailMessage,
    // })

    console.log("[APPLICATION-STATUS-EMAIL] Email notification would be sent to:", applicantEmail)
    console.log("[APPLICATION-STATUS-EMAIL] Subject:", emailSubject)
    console.log("[APPLICATION-STATUS-EMAIL] Message:", emailMessage)

    return NextResponse.json({
      success: true,
      message: "Email notification logged (pending integration with email service)",
      emailDetails: {
        to: applicantEmail,
        subject: emailSubject,
      },
    })
  } catch (error: any) {
    console.error("[APPLICATION-STATUS-EMAIL] Error:", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
