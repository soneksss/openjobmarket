import { createClient } from "@/lib/server"
import { Resend } from "resend"

// Helper function to create Resend instance at runtime
function getResendInstance() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY. Please add it to your environment variables.')
  }
  return new Resend(apiKey)
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface NotificationData {
  user_id: string
  notification_type: string
  template_data: any
}

// Email templates
const EMAIL_TEMPLATES = {
  job_expiration: (data: any): EmailTemplate => ({
    subject: `Your job "${data.job_title}" expires in ${data.days_until_expiration} days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Job Expiration Reminder</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Hi ${data.company_name},</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Your job posting <strong>"${data.job_title}"</strong> will expire in 
            <strong>${data.days_until_expiration} day${data.days_until_expiration === 1 ? "" : "s"}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Expiration Date:</strong> ${new Date(data.expires_at).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Once expired, your job will no longer be visible to candidates on the job map and in search results. 
            You can extend it at any time to keep it active.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}${data.extend_url}" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Extend Job Posting
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You can also manage all your job postings from your 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company" style="color: #3b82f6;">company dashboard</a>.
          </p>
        </div>
        
        <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">
            You're receiving this because you have job expiration notifications enabled. 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy-centre" style="color: #3b82f6;">Update preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `
Hi ${data.company_name},

Your job posting "${data.job_title}" will expire in ${data.days_until_expiration} day${data.days_until_expiration === 1 ? "" : "s"}.

Expiration Date: ${new Date(data.expires_at).toLocaleDateString()}

Once expired, your job will no longer be visible to candidates. You can extend it at any time to keep it active.

Extend your job: ${process.env.NEXT_PUBLIC_APP_URL}${data.extend_url}

Manage all jobs: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company

---
Update notification preferences: ${process.env.NEXT_PUBLIC_APP_URL}/privacy-centre
    `,
  }),

  new_applications: (data: any): EmailTemplate => ({
    subject: `New application for "${data.job_title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Job Application</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Great news, ${data.company_name}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            You have received a new application for your job posting <strong>"${data.job_title}"</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;">
              <strong>Job:</strong> ${data.job_title}<br>
              <strong>Application ID:</strong> ${data.application_id}
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Review the application details, candidate profile, and start the conversation to find your next great hire.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}${data.view_url}" 
               style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              View Application
            </a>
          </div>
        </div>
        
        <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">
            You're receiving this because you have application notifications enabled. 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy-centre" style="color: #3b82f6;">Update preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `
Great news, ${data.company_name}!

You have received a new application for your job posting "${data.job_title}".

Job: ${data.job_title}
Application ID: ${data.application_id}

Review the application and start the conversation to find your next great hire.

View Application: ${process.env.NEXT_PUBLIC_APP_URL}${data.view_url}

---
Update notification preferences: ${process.env.NEXT_PUBLIC_APP_URL}/privacy-centre
    `,
  }),

  messages: (data: any): EmailTemplate => ({
    subject: data.subject || "New message",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Message</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">You have a new message</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
            <p style="margin: 0; color: #5b21b6;">
              <strong>Subject:</strong> ${data.subject || "No subject"}
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            You have received a new message. Click below to view and respond.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}${data.view_url}" 
               style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              View Message
            </a>
          </div>
        </div>
        
        <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">
            You're receiving this because you have message notifications enabled. 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy-centre" style="color: #3b82f6;">Update preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `
You have a new message.

Subject: ${data.subject || "No subject"}

View Message: ${process.env.NEXT_PUBLIC_APP_URL}${data.view_url}

---
Update notification preferences: ${process.env.NEXT_PUBLIC_APP_URL}/privacy-centre
    `,
  }),
}

export async function processNotificationQueue() {
  const supabase = await createClient()

  try {
    // Get pending notifications
    const { data: notifications, error } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(50)

    if (error) throw error

    let processed = 0
    let failed = 0

    for (const notification of notifications || []) {
      try {
        if (notification.channel === "email") {
          await sendEmail(notification)
        } else if (notification.channel === "push") {
          await sendPushNotification(notification)
        }

        // Mark as sent
        await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", notification.id)

        // Add to history
        await supabase.from("notification_history").insert({
          user_id: notification.user_id,
          notification_type: notification.notification_type,
          channel: notification.channel,
          subject: notification.subject,
          metadata: notification.template_data,
        })

        processed++
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error)

        // Mark as failed
        await supabase
          .from("notification_queue")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", notification.id)

        failed++
      }
    }

    return { processed, failed, total: notifications?.length || 0 }
  } catch (error) {
    console.error("Error processing notification queue:", error)
    return { processed: 0, failed: 0, total: 0, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

async function sendEmail(notification: any) {
  // Get user email
  const supabase = await createClient()
  const { data: user, error } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", notification.user_id)
    .single()

  if (error || !user?.email) {
    throw new Error("User email not found")
  }

  // Generate email content from template
  const templateFunction = EMAIL_TEMPLATES[notification.notification_type as keyof typeof EMAIL_TEMPLATES]
  if (!templateFunction) {
    throw new Error(`No template found for notification type: ${notification.notification_type}`)
  }

  const template = templateFunction(notification.template_data)

  // Send email via Resend
  try {
    const resend = getResendInstance()
    const { data, error: sendError } = await resend.emails.send({
      from: "Open Job Market <onboarding@resend.dev>", // Use verified domain in production
      to: [user.email],
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (sendError) {
      console.error("❌ Resend error:", sendError)
      throw new Error(`Failed to send email: ${sendError.message}`)
    }

    console.log("✅ Email sent successfully via Resend:", {
      to: user.email,
      subject: template.subject,
      messageId: data?.id,
      notification_type: notification.notification_type,
    })
  } catch (error) {
    console.error("❌ Email sending failed:", error)
    throw error
  }
}

async function sendPushNotification(notification: any) {
  // In production, integrate with push notification service (Firebase, OneSignal, etc.)
  console.log("🔔 Push Notification:", {
    user_id: notification.user_id,
    title: notification.subject,
    body: notification.content,
    data: notification.template_data,
  })

  // Simulate push sending delay
  await new Promise((resolve) => setTimeout(resolve, 50))
}
