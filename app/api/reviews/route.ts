import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { validateReview, sanitizeReviewText } from "@/lib/profanity-filter"

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
 * Submit a new review
 * Body: { revieweeId, rating, reviewText?, conversationId? }
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
    const { revieweeId, rating, reviewText, conversationId } = body

    // Validate input
    if (!revieweeId) {
      return NextResponse.json({ error: "revieweeId is required" }, { status: 400 })
    }

    if (user.id === revieweeId) {
      return NextResponse.json({ error: "You cannot review yourself" }, { status: 400 })
    }

    // Validate review content
    const sanitizedText = reviewText ? sanitizeReviewText(reviewText) : null
    const validation = validateReview(rating, sanitizedText || "")

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // Check if interaction is verified
    const { data: canReview, error: checkError } = await supabase.rpc("can_user_review", {
      p_reviewer_id: user.id,
      p_reviewee_id: revieweeId,
    })

    if (checkError) {
      console.error("[API] Error checking review eligibility:", checkError)
      return NextResponse.json({ error: "Failed to verify interaction" }, { status: 500 })
    }

    if (!canReview) {
      return NextResponse.json(
        {
          error: "You can only review users you've had verified interactions with",
        },
        { status: 403 }
      )
    }

    // Check if user has already reviewed this person for this interaction
    const { data: existingReview, error: existingError } = await supabase
      .from("reviews")
      .select("id")
      .eq("reviewer_id", user.id)
      .eq("reviewee_id", revieweeId)
      .eq("conversation_id", conversationId || null)
      .single()

    if (existingReview) {
      return NextResponse.json(
        {
          error: "You have already reviewed this user for this interaction",
        },
        { status: 409 }
      )
    }

    // Insert the review
    const { data: newReview, error: insertError } = await supabase
      .from("reviews")
      .insert({
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        review_text: sanitizedText,
        interaction_verified: true,
        conversation_id: conversationId || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[API] Error inserting review:", insertError)
      return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
    }

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
