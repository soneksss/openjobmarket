/**
 * Email Service - Handles sending email notifications
 * Uses Resend (https://resend.com) for email delivery
 *
 * Setup:
 * 1. Sign up at https://resend.com
 * 2. Add RESEND_API_KEY to your .env.local file
 * 3. Verify your domain or use onboarding@resend.dev for testing
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  // If no API key, log warning and return success (fail silently in dev)
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY not configured - email not sent')
    console.log('[EMAIL] Would have sent:', {
      to: options.to,
      subject: options.subject,
    })
    return { success: true, messageId: 'dev-mode-no-api-key' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'OpenJobMarket <noreply@openjobmarket.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[EMAIL] Failed to send email:', data)
      return {
        success: false,
        error: data.message || 'Failed to send email',
      }
    }

    console.log('[EMAIL] Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      messageId: data.id,
    })

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log notification to database
 */
export async function logNotification(
  supabase: any,
  userId: string,
  notificationType: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed' | 'pending',
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase
      .from('notification_log')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        notification_method: 'email',
        recipient_email: recipientEmail,
        subject,
        status,
        error_message: errorMessage,
        metadata: metadata || {},
      })

    if (error) {
      console.error('[EMAIL] Failed to log notification:', error)
    }
  } catch (err) {
    console.error('[EMAIL] Error logging notification:', err)
  }
}

/**
 * Check if user has email notifications enabled for a specific type
 */
export async function shouldSendEmailNotification(
  supabase: any,
  userId: string,
  notificationType: 'new_message' | 'job_application' | 'job_offer' | 'application_status_change'
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_notification_preferences', {
      p_user_id: userId,
    })

    if (error) {
      console.error('[EMAIL] Error fetching notification preferences:', error)
      return true // Default to sending if we can't check preferences
    }

    if (!data || data.length === 0) {
      return true // Default to sending
    }

    const prefs = data[0]

    switch (notificationType) {
      case 'new_message':
        return prefs.email_on_new_message
      case 'job_application':
        return prefs.email_on_job_application
      case 'job_offer':
        return prefs.email_on_job_offer
      case 'application_status_change':
        return prefs.email_on_application_status_change
      default:
        return true
    }
  } catch (err) {
    console.error('[EMAIL] Error checking notification preferences:', err)
    return true // Default to sending on error
  }
}
