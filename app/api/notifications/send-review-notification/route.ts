import { createClient, createAdminClient } from "@/lib/server"
import { sendEmail, logNotification } from "@/lib/email/service"
import { newReviewEmail } from "@/lib/email/templates"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/notifications/send-review-notification
 * Notifies a tradesperson that they received a new review.
 *
 * Body: { reviewedUserId, reviewerName, rating, jobTitle, jobId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewedUserId, reviewerName, rating, jobTitle, jobId } = body

    if (!reviewedUserId || !rating || !jobTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }

    // Resolve recipient name and email
    const { data: recipientUser } = await supabase
      .from("users")
      .select("email, user_type")
      .eq("id", reviewedUserId)
      .single()

    if (!recipientUser) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    let recipientName = "there"
    if (recipientUser.user_type === "contractor") {
      const { data: p } = await supabase
        .from("contractor_profiles")
        .select("company_name, user_id")
        .eq("user_id", reviewedUserId)
        .maybeSingle()
      if (p) recipientName = p.company_name
    } else if (recipientUser.user_type === "professional") {
      const { data: p } = await supabase
        .from("professional_profiles")
        .select("first_name, last_name")
        .eq("user_id", reviewedUserId)
        .maybeSingle()
      if (p) recipientName = `${p.first_name} ${p.last_name}`.trim()
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
    const profileUrl = `${baseUrl}/contractors/${reviewedUserId}`
    const settingsUrl = `${baseUrl}/dashboard/settings#notifications`
    const stars = '⭐'.repeat(rating)

    // ── In-app notification (bell icon) ──────────────────────
    const { error: inAppError } = await adminClient
      .from("notifications")
      .insert({
        user_id: reviewedUserId,
        type: "new_review",
        title: `You received a new ${stars} review!`,
        message: `A homeowner left you a ${rating}-star review for "${jobTitle}". View your profile.`,
        link_url: profileUrl,
        is_read: false,
      })

    if (inAppError) {
      console.error("[REVIEW-NOTIFICATION] In-app insert failed:", inAppError)
    }

    // ── Email ─────────────────────────────────────────────────
    const { html, text } = newReviewEmail({
      recipientName,
      rating,
      jobTitle,
      reviewerName: reviewerName || "A homeowner",
      profileUrl,
      settingsUrl,
    })

    const result = await sendEmail({
      to: recipientUser.email,
      subject: `${stars} You received a new review on OpenJobMarket`,
      html,
      text,
    })

    await logNotification(
      adminClient,
      reviewedUserId,
      "new_review",
      recipientUser.email,
      `New ${rating}-star review for "${jobTitle}"`,
      result.success ? "sent" : "failed",
      result.error,
      { rating, job_id: jobId, reviewer_name: reviewerName }
    )

    return NextResponse.json({
      success: true,
      emailSent: result.success,
      inAppCreated: !inAppError,
    })
  } catch (error) {
    console.error("[REVIEW-NOTIFICATION] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
