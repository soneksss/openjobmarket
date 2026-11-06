import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

// Force Node.js runtime
export const runtime = 'nodejs'

// Contact-form messages go to the address in the CONTACT_EMAIL environment
// variable (set on Vercel). It is never in the code or on the site, so it
// can't be scraped from the page or from the public repository.

function getResendInstance() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }
  return new Resend(apiKey)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

const LIMITS = { name: 100, email: 200, subject: 200, message: 5000 }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message, website } = body ?? {}

    // Honeypot: a hidden field real visitors never fill in. Bots that do get a
    // normal-looking success so they don't retry.
    if (website) {
      return NextResponse.json({ success: true, message: "Your message has been sent successfully!" })
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required: name, email, subject, message" },
        { status: 400 }
      )
    }
    if ([name, email, subject, message].some(v => typeof v !== "string")
      || name.length > LIMITS.name || email.length > LIMITS.email
      || subject.length > LIMITS.subject || message.length > LIMITS.message) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    const to = process.env.CONTACT_EMAIL
    if (!to) {
      console.error("[CONTACT-FORM] CONTACT_EMAIL is not set")
      return NextResponse.json({ error: "Failed to send email. Please try again later." }, { status: 500 })
    }

    const safe = { name: escapeHtml(name), email: escapeHtml(email), subject: escapeHtml(subject), message: escapeHtml(message) }

    // Prepare email content
    const emailSubject = `[Contact Form] ${subject.replace(/[\r\n]+/g, " ")}`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Contact Details</h2>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #666;">
              <strong style="color: #333;">From:</strong> ${safe.name}
            </p>
            <p style="margin: 5px 0; color: #666;">
              <strong style="color: #333;">Email:</strong> ${safe.email}
            </p>
            <p style="margin: 5px 0; color: #666;">
              <strong style="color: #333;">Subject:</strong> ${safe.subject}
            </p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Message:</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${safe.message}</p>
          </div>

          <p style="margin-top: 20px; color: #0369a1; font-size: 14px;">
            Reply to this email to answer ${safe.name}.
          </p>
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

    // Send email via Resend
    const resend = getResendInstance()
    const { data, error: sendError } = await resend.emails.send({
      from: "Open Job Market <onboarding@resend.dev>", // Use verified domain in production
      to: [to],
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

    console.log("[CONTACT-FORM] Email sent:", { messageId: data?.id })

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
    })
  } catch (error: any) {
    console.error("[CONTACT-FORM] Error:", error?.message)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    )
  }
}
