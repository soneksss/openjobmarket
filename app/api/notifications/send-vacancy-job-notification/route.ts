import { createClient, createAdminClient } from "@/lib/server"
import { sendEmail, logNotification } from "@/lib/email/service"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/notifications/send-vacancy-job-notification
 * Sends notifications to professionals when a matching vacancy job is posted
 *
 * Body:
 * {
 *   jobId: string,
 *   jobTitle: string,
 *   jobLat: number,
 *   jobLon: number,
 *   jobSkills: string[],
 *   companyName: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, jobTitle, jobLat, jobLon, jobSkills, companyName } = body

    if (!jobId || !jobTitle || jobLat === undefined || jobLon === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("[VACANCY-JOB-NOTIFICATION] Processing notifications for job:", {
      jobId,
      jobTitle,
      lat: jobLat,
      lon: jobLon,
      skills: jobSkills,
      companyName,
    })

    // Debug: Check if this is a valid coordinate
    if (isNaN(jobLat) || isNaN(jobLon) || jobLat < -90 || jobLat > 90 || jobLon < -180 || jobLon > 180) {
      console.error("[VACANCY-JOB-NOTIFICATION] Invalid coordinates:", { jobLat, jobLon })
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
      console.warn("[VACANCY-JOB-NOTIFICATION] Admin client not available, using regular client")
      adminClient = supabase
    }

    // Find matching professionals using the database function
    const { data: matchingProfessionals, error: matchError } = await adminClient.rpc(
      "find_professionals_for_vacancy_notification",
      {
        p_job_id: jobId,
        p_job_lat: jobLat,
        p_job_lon: jobLon,
        p_job_skills: jobSkills || [],
      }
    )

    if (matchError) {
      console.error("[VACANCY-JOB-NOTIFICATION] Error finding matching professionals:", matchError)
      // Don't fail - just return empty
      return NextResponse.json({
        success: true,
        notificationsSent: 0,
        error: matchError.message,
      })
    }

    if (!matchingProfessionals || matchingProfessionals.length === 0) {
      console.log("[VACANCY-JOB-NOTIFICATION] No matching professionals found. Debug info:", {
        jobId,
        jobTitle,
        jobLat,
        jobLon,
        jobSkills,
        hint: "Check: 1) Professionals have vacancy_job_notifications=true, 2) Professionals have valid coordinates, 3) Professionals are within distance radius, 4) Skills match"
      })

      // Debug: Query to see what professionals have vacancy notifications enabled
      const { data: notifEnabledProfs } = await adminClient
        .from("professional_profiles")
        .select("id, first_name, last_name, vacancy_job_notifications, vacancy_job_notifications_distance, latitude, longitude, skills")
        .eq("vacancy_job_notifications", true)
        .limit(10)

      if (notifEnabledProfs && notifEnabledProfs.length > 0) {
        console.log("[VACANCY-JOB-NOTIFICATION] Professionals with vacancy notifications enabled:", notifEnabledProfs.map(p => ({
          name: `${p.first_name} ${p.last_name}`,
          hasCoords: !!(p.latitude && p.longitude),
          distance: p.vacancy_job_notifications_distance,
          skills: p.skills,
        })))
      } else {
        console.log("[VACANCY-JOB-NOTIFICATION] No professionals have vacancy_job_notifications=true")
      }

      return NextResponse.json({
        success: true,
        notificationsSent: 0,
        message: "No matching professionals found",
      })
    }

    console.log(
      "[VACANCY-JOB-NOTIFICATION] Found",
      matchingProfessionals.length,
      "matching professionals"
    )

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
    const jobUrl = `${baseUrl}/jobs/${jobId}`
    const settingsUrl = `${baseUrl}/dashboard/settings#notifications`

    let successCount = 0
    let emailCount = 0

    // Send notifications to each matching professional
    for (const professional of matchingProfessionals) {
      try {
        // Create in-app notification
        const { error: notifError } = await adminClient
          .from("notifications")
          .insert({
            user_id: professional.user_id,
            type: "vacancy_job_match",
            title: `New job nearby: ${jobTitle}`,
            message: `${companyName || 'A company'} posted a job matching your skills within ${Math.round(professional.distance_miles)} miles.`,
            link_url: jobUrl,
            is_read: false,
          })

        if (notifError) {
          console.error(
            "[VACANCY-JOB-NOTIFICATION] Error creating in-app notification for professional:",
            professional.professional_id,
            notifError
          )
        } else {
          successCount++
          console.log(
            "[VACANCY-JOB-NOTIFICATION] In-app notification created for:",
            professional.professional_name
          )
        }

        // Check if professional wants email notifications
        const { data: emailPrefs } = await adminClient
          .from("user_notification_preferences")
          .select("email_on_vacancy_job_match")
          .eq("user_id", professional.user_id)
          .single()

        const shouldSendEmail = emailPrefs?.email_on_vacancy_job_match ?? true

        if (shouldSendEmail && professional.email) {
          // Send email notification
          const emailResult = await sendEmail({
            to: professional.email,
            subject: `New job nearby: ${jobTitle}`,
            html: generateVacancyJobEmailHtml({
              professionalName: professional.professional_name,
              jobTitle,
              companyName: companyName || 'A company',
              distanceMiles: Math.round(professional.distance_miles),
              jobUrl,
              settingsUrl,
            }),
            text: generateVacancyJobEmailText({
              professionalName: professional.professional_name,
              jobTitle,
              companyName: companyName || 'A company',
              distanceMiles: Math.round(professional.distance_miles),
              jobUrl,
              settingsUrl,
            }),
          })

          if (emailResult.success) {
            emailCount++
            console.log(
              "[VACANCY-JOB-NOTIFICATION] Email sent to:",
              professional.email
            )
          } else {
            console.error(
              "[VACANCY-JOB-NOTIFICATION] Failed to send email to:",
              professional.email,
              emailResult.error
            )
          }

          // Log the notification
          await logNotification(
            adminClient,
            professional.user_id,
            "vacancy_job_match",
            professional.email,
            `New job nearby: ${jobTitle}`,
            emailResult.success ? "sent" : "failed",
            emailResult.error,
            {
              job_id: jobId,
              job_title: jobTitle,
              distance_miles: professional.distance_miles,
            }
          )
        }
      } catch (professionalError) {
        console.error(
          "[VACANCY-JOB-NOTIFICATION] Error notifying professional:",
          professional.professional_id,
          professionalError
        )
      }
    }

    console.log("[VACANCY-JOB-NOTIFICATION] Complete:", {
      totalMatching: matchingProfessionals.length,
      inAppNotifications: successCount,
      emailsSent: emailCount,
    })

    return NextResponse.json({
      success: true,
      notificationsSent: successCount,
      emailsSent: emailCount,
      totalMatching: matchingProfessionals.length,
    })
  } catch (error) {
    console.error("[VACANCY-JOB-NOTIFICATION] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to generate HTML email
function generateVacancyJobEmailHtml(params: {
  professionalName: string
  jobTitle: string
  companyName: string
  distanceMiles: number
  jobUrl: string
  settingsUrl: string
}): string {
  const { professionalName, jobTitle, companyName, distanceMiles, jobUrl, settingsUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Opportunity Nearby</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">New Job Opportunity!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${professionalName},</p>

    <p>A new job has been posted that matches your skills:</p>

    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${jobTitle}</h2>
      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Posted by: ${companyName}</p>
      <p style="margin: 5px 0; color: #2563eb; font-size: 14px; font-weight: 500;">Distance: ${distanceMiles} miles from your location</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${jobUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Job & Apply</a>
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      You're receiving this because you have job notifications enabled for your area.
      <a href="${settingsUrl}" style="color: #2563eb;">Manage notification settings</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}

// Helper function to generate plain text email
function generateVacancyJobEmailText(params: {
  professionalName: string
  jobTitle: string
  companyName: string
  distanceMiles: number
  jobUrl: string
  settingsUrl: string
}): string {
  const { professionalName, jobTitle, companyName, distanceMiles, jobUrl, settingsUrl } = params

  return `
New Job Opportunity!

Hi ${professionalName},

A new job has been posted that matches your skills:

${jobTitle}
Posted by: ${companyName}
Distance: ${distanceMiles} miles from your location

View the job and apply: ${jobUrl}

---
You're receiving this because you have job notifications enabled for your area.
Manage notification settings: ${settingsUrl}
  `.trim()
}
