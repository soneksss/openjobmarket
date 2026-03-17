import { createClient, createAdminClient } from "@/lib/server"
import { sendEmail, logNotification } from "@/lib/email/service"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/notifications/send-trade-job-notification
 * Sends notifications to companies when a matching trade job is posted
 *
 * Body:
 * {
 *   jobId: string,
 *   jobTitle: string,
 *   jobLat: number,
 *   jobLon: number,
 *   jobSkills: string[],
 *   posterName: string,
 *   urgencyType?: string // "asap" | "today" | "flexible" | null
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, jobTitle, jobLat, jobLon, jobSkills, posterName, urgencyType, jobIndustry, jobService } = body

    if (!jobId || !jobTitle || jobLat === undefined || jobLon === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("[TRADE-JOB-NOTIFICATION] Processing notifications for job:", {
      jobId,
      jobTitle,
      lat: jobLat,
      lon: jobLon,
      skills: jobSkills,
      posterName,
    })

    // Debug: Check if this is a valid coordinate
    if (isNaN(jobLat) || isNaN(jobLon) || jobLat < -90 || jobLat > 90 || jobLon < -180 || jobLon > 180) {
      console.error("[TRADE-JOB-NOTIFICATION] Invalid coordinates:", { jobLat, jobLon })
      return NextResponse.json({
        success: false,
        error: "Invalid coordinates provided",
      }, { status: 400 })
    }

    // Use admin client for system-level operations
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (e) {
      const supabase = await createClient()
      console.warn("[TRADE-JOB-NOTIFICATION] Admin client not available, using regular client")
      adminClient = supabase
    }

    // Find matching companies using the database function
    const { data: matchingCompanies, error: matchError } = await adminClient.rpc(
      "find_companies_for_trade_job_notification",
      {
        p_job_id: jobId,
        p_job_lat: jobLat,
        p_job_lon: jobLon,
        p_job_skills: jobSkills || [],
        p_job_industry: jobIndustry || null,
        p_job_service: jobService || null,
      }
    )

    if (matchError) {
      console.error("[TRADE-JOB-NOTIFICATION] Error finding matching companies:", matchError)
      // Don't fail - just return empty
      return NextResponse.json({
        success: true,
        notificationsSent: 0,
        error: matchError.message,
      })
    }

    if (!matchingCompanies || matchingCompanies.length === 0) {
      console.log("[TRADE-JOB-NOTIFICATION] No matching companies found. Debug info:", {
        jobId,
        jobTitle,
        jobLat,
        jobLon,
        jobSkills,
        hint: "Check: 1) Companies have trade_job_notifications=true, 2) Companies have valid coordinates, 3) Companies are within distance radius, 4) Services/skills match (case-insensitive)"
      })

      // Debug: Query to see what companies have trade notifications enabled
      const { data: tradeEnabledCompanies } = await adminClient
        .from("company_profiles")
        .select("id, company_name, trade_job_notifications, trade_job_notifications_distance, latitude, longitude, services")
        .eq("trade_job_notifications", true)
        .limit(10)

      if (tradeEnabledCompanies && tradeEnabledCompanies.length > 0) {
        console.log("[TRADE-JOB-NOTIFICATION] Companies with trade notifications enabled:", tradeEnabledCompanies.map(c => ({
          name: c.company_name,
          hasCoords: !!(c.latitude && c.longitude),
          distance: c.trade_job_notifications_distance,
          services: c.services,
        })))
      } else {
        console.log("[TRADE-JOB-NOTIFICATION] No companies have trade_job_notifications=true")
      }

      return NextResponse.json({
        success: true,
        notificationsSent: 0,
        message: "No matching companies found",
      })
    }

    console.log(
      "[TRADE-JOB-NOTIFICATION] Found",
      matchingCompanies.length,
      "matching companies"
    )

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
    const jobUrl = `${baseUrl}/jobs/${jobId}`
    const settingsUrl = `${baseUrl}/account/settings#notifications`

    let successCount = 0
    let emailCount = 0

    // Send notifications to each matching company
    for (const company of matchingCompanies) {
      try {
        // Create in-app notification
        const isUrgent = urgencyType === "asap" || urgencyType === "today"
        const notifTitle = isUrgent
          ? `🚨 Urgent job nearby: ${jobTitle}`
          : `🔔 New job nearby: ${jobTitle}`
        const notifMessage = isUrgent
          ? `${posterName} posted an urgent job within ${Math.round(company.distance_miles)} miles. Respond quickly!`
          : `${posterName} posted a flexible job matching your trade within ${Math.round(company.distance_miles)} miles.`

        const { error: notifError } = await adminClient
          .from("notifications")
          .insert({
            user_id: company.user_id,
            type: "trade_job_match",
            title: notifTitle,
            message: notifMessage,
            link_url: jobUrl,
            is_read: false,
          })

        if (notifError) {
          console.error(
            "[TRADE-JOB-NOTIFICATION] Error creating in-app notification for company:",
            company.company_id,
            notifError
          )
        } else {
          successCount++
          console.log(
            "[TRADE-JOB-NOTIFICATION] In-app notification created for:",
            company.company_name
          )
        }

        // Skip email notifications for ASAP jobs (they expire quickly and create spam)
        const isAsapJob = urgencyType === "asap"

        if (isAsapJob) {
          console.log("[TRADE-JOB-NOTIFICATION] Skipping email for ASAP job (quick expiry)")
        }

        // Check if company wants email notifications
        const { data: emailPrefs } = await adminClient
          .from("user_notification_preferences")
          .select("email_on_trade_job_match")
          .eq("user_id", company.user_id)
          .single()

        const shouldSendEmail = !isAsapJob && (emailPrefs?.email_on_trade_job_match ?? true)

        if (shouldSendEmail && company.email) {
          // Send email notification
          const emailResult = await sendEmail({
            to: company.email,
            subject: `New trade job nearby: ${jobTitle}`,
            html: generateTradeJobEmailHtml({
              companyName: company.company_name,
              jobTitle,
              posterName,
              distanceMiles: Math.round(company.distance_miles),
              jobUrl,
              settingsUrl,
            }),
            text: generateTradeJobEmailText({
              companyName: company.company_name,
              jobTitle,
              posterName,
              distanceMiles: Math.round(company.distance_miles),
              jobUrl,
              settingsUrl,
            }),
          })

          if (emailResult.success) {
            emailCount++
            console.log(
              "[TRADE-JOB-NOTIFICATION] Email sent to:",
              company.email
            )
          } else {
            console.error(
              "[TRADE-JOB-NOTIFICATION] Failed to send email to:",
              company.email,
              emailResult.error
            )
          }

          // Log the notification
          await logNotification(
            adminClient,
            company.user_id,
            "trade_job_match",
            company.email,
            `New trade job nearby: ${jobTitle}`,
            emailResult.success ? "sent" : "failed",
            emailResult.error,
            {
              job_id: jobId,
              job_title: jobTitle,
              distance_miles: company.distance_miles,
            }
          )
        }
      } catch (companyError) {
        console.error(
          "[TRADE-JOB-NOTIFICATION] Error notifying company:",
          company.company_id,
          companyError
        )
      }
    }

    console.log("[TRADE-JOB-NOTIFICATION] Complete:", {
      totalMatching: matchingCompanies.length,
      inAppNotifications: successCount,
      emailsSent: emailCount,
    })

    return NextResponse.json({
      success: true,
      notificationsSent: successCount,
      emailsSent: emailCount,
      totalMatching: matchingCompanies.length,
    })
  } catch (error) {
    console.error("[TRADE-JOB-NOTIFICATION] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to generate HTML email
function generateTradeJobEmailHtml(params: {
  companyName: string
  jobTitle: string
  posterName: string
  distanceMiles: number
  jobUrl: string
  settingsUrl: string
}): string {
  const { companyName, jobTitle, posterName, distanceMiles, jobUrl, settingsUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Trade Job Nearby</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">New Trade Job Nearby! 🔔</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${companyName},</p>

    <p>A new trade job has been posted that matches your services:</p>

    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${jobTitle}</h2>
      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Posted by: ${posterName}</p>
      <p style="margin: 5px 0; color: #7c3aed; font-size: 14px; font-weight: 500;">📍 ${distanceMiles} miles from your location</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${jobUrl}" style="display: inline-block; background: #9333ea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Job Details</a>
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      You're receiving this because you have trade job notifications enabled for your area.
      <a href="${settingsUrl}" style="color: #9333ea;">Manage notification settings</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}

// Helper function to generate plain text email
function generateTradeJobEmailText(params: {
  companyName: string
  jobTitle: string
  posterName: string
  distanceMiles: number
  jobUrl: string
  settingsUrl: string
}): string {
  const { companyName, jobTitle, posterName, distanceMiles, jobUrl, settingsUrl } = params

  return `
New Trade Job Nearby!

Hi ${companyName},

A new trade job has been posted that matches your services:

${jobTitle}
Posted by: ${posterName}
Distance: ${distanceMiles} miles from your location

View the job: ${jobUrl}

---
You're receiving this because you have trade job notifications enabled for your area.
Manage notification settings: ${settingsUrl}
  `.trim()
}
