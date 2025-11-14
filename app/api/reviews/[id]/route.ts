import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { validateReview, sanitizeReviewText } from "@/lib/profanity-filter"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * PUT /api/reviews/[id]
 * Update an existing review (within 24 hours)
 * Body: { rating?, reviewText? }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

    const { id: reviewId } = await context.params
    const body = await request.json()
    const { rating, reviewText } = body

    // Fetch the existing review
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .eq("reviewer_id", user.id)
      .single()

    if (fetchError || !existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Check if within 24 hours
    const createdAt = new Date(existingReview.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      return NextResponse.json(
        {
          error: "Reviews can only be edited within 24 hours of submission",
        },
        { status: 403 }
      )
    }

    // Validate new content
    const newRating = rating !== undefined ? rating : existingReview.rating
    const newText = reviewText !== undefined ? sanitizeReviewText(reviewText) : existingReview.review_text

    const validation = validateReview(newRating, newText || "")

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // Update the review
    const updateData: any = {}
    if (rating !== undefined) updateData.rating = rating
    if (reviewText !== undefined) updateData.review_text = newText

    const { data: updatedReview, error: updateError } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", reviewId)
      .eq("reviewer_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("[API] Error updating review:", updateError)
      return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: "Review updated successfully",
        review: updatedReview,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[API] Unexpected error in PUT /api/reviews/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/reviews/[id]
 * Delete an existing review (within 24 hours)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    const { id: reviewId } = await context.params

    // Fetch the existing review
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .eq("reviewer_id", user.id)
      .single()

    if (fetchError || !existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Check if within 24 hours
    const createdAt = new Date(existingReview.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      return NextResponse.json(
        {
          error: "Reviews can only be deleted within 24 hours of submission",
        },
        { status: 403 }
      )
    }

    // Delete the review
    const { error: deleteError } = await supabase.from("reviews").delete().eq("id", reviewId).eq("reviewer_id", user.id)

    if (deleteError) {
      console.error("[API] Error deleting review:", deleteError)
      return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: "Review deleted successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[API] Unexpected error in DELETE /api/reviews/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
