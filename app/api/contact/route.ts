import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

// Force Node.js runtime
export const runtime = 'nodejs'

// Admin email - can be moved to environment variable if needed
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "info@openjobmarket.com"

function getResendInstance() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }
  return new Resend(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    console.log("[CONTACT-FORM] Processing contact form submission...")

    const body = await request.json()
    const { name, email, subject, message } = body

    console.log("[CONTACT-FORM] Request details:", {
      name,
      email,
      subject,
      messageLength: message?.length,
    })

    // Validate required fields
    if (!name || !email || !subject || !message) {
      console.log("[CONTACT-FORM] Missing required fields")
      return NextResponse.json(
        { error: "All fields are required: name, email, subject, message" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("[CONTACT-FORM] Invalid email format")
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // Prepare email content
    const emailSubject = `[Contact Form] ${subject}`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Contact Details</h2>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #666;">
              <strong style="color: #333;">From:</strong> ${name}
            </p>
            <p style="margin: 5px 0; color: #666;">
              <strong style="color: #333;">Email:</strong> <a href="mailto:${email}" style="color: #3b82f6;">${email}</a>
            </p>
            <p style="margin: 5px 0; color: #666;">
              <strong style="color: #333;">Subject:</strong> ${subject}
            </p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h3 style="margin-top: 0; color: #333;">Message:</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 8px;">
            <p style="margin: 0; color: #0369a1; font-size: 14px;">
              💡 <strong>Tip:</strong> You can reply directly to this email to respond to ${name}.
            </p>
          </div>
        </div>

        <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">
            This email was sent from the Open Job Market contact form.
          </p>
        </div>
      </div>
    `

    const emailText = `
New Contact Form Submission

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This email was sent from the Open Job Market contact form.
You can reply directly to this email to respond to ${name}.
    `

    console.log("[CONTACT-FORM] Sending email to admin:", ADMIN_EMAIL)

    // Send email via Resend
    const resend = getResendInstance()
    const { data, error: sendError } = await resend.emails.send({
      from: "Open Job Market <onboarding@resend.dev>", // Use verified domain in production
      to: [ADMIN_EMAIL],
      replyTo: email, // Allow admin to reply directly to the user
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    })

    if (sendError) {
      console.error("[CONTACT-FORM] Resend error:", sendError)
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 }
      )
    }

    console.log("[CONTACT-FORM] Email sent successfully:", {
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: emailSubject,
      messageId: data?.id,
    })

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
    })
  } catch (error: any) {
    console.error("[CONTACT-FORM] Error:", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    )
  }
}
