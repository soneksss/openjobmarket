import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { validateReview, sanitizeReviewText } from "@/lib/profanity-filter"
import { revalidateTag, revalidatePath } from "next/cache"

/**
 * GET /api/reviews
 * Fetch reviews for a specific user
 * Query params: userId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch reviews for the user
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        review_text,
        created_at,
        updated_at,
        is_edited,
        reviewer_id
      `)
      .eq("reviewee_id", userId)
      .eq("is_flagged", false)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API] Error fetching reviews:", error)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    // Fetch reviewer information for each review
    const reviewerIds = reviews?.map((r: any) => r.reviewer_id) || []

    if (reviewerIds.length > 0) {
      // Get profiles based on user type
      const { data: professionalProfiles } = await supabase
        .from("professional_profiles")
        .select("user_id, first_name, last_name, profile_photo_url")
        .in("user_id", reviewerIds)

      const { data: companyProfiles } = await supabase
        .from("company_profiles")
        .select("user_id, company_name, logo_url")
        .in("user_id", reviewerIds)

      // Merge reviewer info into reviews
      const enrichedReviews = reviews?.map((review: any) => {
        const professionalProfile = professionalProfiles?.find((p: any) => p.user_id === review.reviewer_id)
        const companyProfile = companyProfiles?.find((c: any) => c.user_id === review.reviewer_id)

        return {
          ...review,
          reviewer: professionalProfile
            ? {
                type: "professional",
                name: `${professionalProfile.first_name} ${professionalProfile.last_name}`,
                photo_url: professionalProfile.profile_photo_url,
              }
            : companyProfile
            ? {
                type: "company",
                name: companyProfile.company_name,
                photo_url: companyProfile.logo_url,
              }
            : {
                type: "unknown",
                name: "Anonymous User",
                photo_url: null,
              },
        }
      })

      return NextResponse.json({ reviews: enrichedReviews }, { status: 200 })
    }

    return NextResponse.json({ reviews: [] }, { status: 200 })
  } catch (error) {
    console.error("[API] Unexpected error in GET /api/reviews:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/reviews
 * Submit a new review (Job-based system)
 * Body: { jobId, reviewedUserId, reviewedUserType, reviewerType, rating, comment }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, reviewedUserId, reviewedUserType, reviewerType, rating, comment } = body

    // Validate input
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 })
    }

    if (!reviewedUserId) {
      return NextResponse.json({ error: "reviewedUserId is required" }, { status: 400 })
    }

    if (!reviewedUserType || !reviewerType) {
      return NextResponse.json({ error: "User types are required" }, { status: 400 })
    }

    if (user.id === reviewedUserId) {
      return NextResponse.json({ error: "You cannot review yourself" }, { status: 400 })
    }

    // Validate review content
    const sanitizedComment = comment ? sanitizeReviewText(comment) : ""
    const validation = validateReview(rating, sanitizedComment)

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // Check if review is allowed using the new RPC function
    const { data: eligibility, error: checkError } = await supabase.rpc("is_review_allowed", {
      p_job_id: jobId,
      p_reviewer_id: user.id,
      p_reviewed_id: reviewedUserId,
    })

    if (checkError) {
      console.error("[API] Error checking review eligibility:", checkError)
      return NextResponse.json({ error: "Failed to verify review eligibility" }, { status: 500 })
    }

    // The RPC returns a table with allowed and reason columns
    const eligibilityResult = eligibility?.[0]

    if (!eligibilityResult?.allowed) {
      return NextResponse.json(
        {
          error: eligibilityResult?.reason || "You are not allowed to review this user for this job",
        },
        { status: 403 }
      )
    }

    // Insert the review with new schema
    const { data: newReview, error: insertError } = await supabase
      .from("reviews")
      .insert({
        job_id: jobId,
        reviewer_id: user.id,
        reviewed_id: reviewedUserId,
        reviewer_type: reviewerType,
        reviewed_type: reviewedUserType,
        rating,
        comment: sanitizedComment,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[API] Error inserting review:", insertError)

      // Check for duplicate review constraint
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: "You have already reviewed this user for this job" },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
    }

    // Bust the homeowner's cached review list so the new review appears immediately
    revalidateTag(`reviews-user-${reviewedUserId}`)
    revalidatePath("/dashboard/homeowner")

    // ── Fire-and-forget: notify the tradesperson ─────────────
    // Fetch job title + reviewer name in parallel (non-blocking)
    Promise.all([
      supabase.from("jobs").select("title").eq("id", jobId).single(),
      supabase.from("homeowner_profiles").select("first_name, last_name").eq("user_id", user.id).maybeSingle(),
    ]).then(([jobRes, reviewerRes]) => {
      const jobTitle = jobRes.data?.title ?? "a job"
      const reviewerName = reviewerRes.data
        ? `${reviewerRes.data.first_name} ${reviewerRes.data.last_name}`.trim()
        : "A homeowner"

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
      fetch(`${baseUrl}/api/notifications/send-review-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewedUserId, reviewerName, rating, jobTitle, jobId }),
      }).catch((err) => console.error("[API] Review notification fire-and-forget failed:", err))
    }).catch((err) => console.error("[API] Failed to fetch review notification data:", err))

    return NextResponse.json(
      {
        message: "Review submitted successfully",
        review: newReview,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] Unexpected error in POST /api/reviews:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
