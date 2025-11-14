"use server"

import { createClient } from "@/lib/server"
import { revalidatePath } from "next/cache"

interface SubmitReviewParams {
  revieweeId: string
  rating: number
  reviewText: string | null
  conversationId: string | null
}

export async function submitReview({
  revieweeId,
  rating,
  reviewText,
  conversationId,
}: SubmitReviewParams) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to submit a review" }
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return { error: "Rating must be between 1 and 5 stars" }
    }

    // Check if user is trying to review themselves
    if (user.id === revieweeId) {
      return { error: "You cannot review yourself" }
    }

    // Check if user has already reviewed this person (globally, not per conversation)
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id, rating, review_text, created_at")
      .eq("reviewer_id", user.id)
      .eq("reviewee_id", revieweeId)
      .single()

    let review

    if (existingReview) {
      // Update existing review
      const { data: updatedReview, error: updateError } = await supabase
        .from("reviews")
        .update({
          rating,
          review_text: reviewText,
          updated_at: new Date().toISOString(),
          is_edited: true,
        })
        .eq("id", existingReview.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating review:", updateError)
        return { error: "Failed to update review. Please try again." }
      }

      review = updatedReview
    } else {
      // Insert new review
      const { data: newReview, error: insertError } = await supabase
        .from("reviews")
        .insert({
          reviewer_id: user.id,
          reviewee_id: revieweeId,
          rating,
          review_text: reviewText,
          conversation_id: conversationId,
          interaction_verified: !!conversationId, // Verified if from a conversation
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error inserting review:", insertError)
        return { error: "Failed to submit review. Please try again." }
      }

      review = newReview
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard/company")
    revalidatePath("/companies")
    revalidatePath("/messages")

    return {
      success: true,
      review,
      isEdit: !!existingReview
    }
  } catch (error) {
    console.error("Error submitting review:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getUserReviewForCompany(revieweeId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    const { data: review } = await supabase
      .from("reviews")
      .select("id, rating, review_text, created_at, is_edited")
      .eq("reviewer_id", user.id)
      .eq("reviewee_id", revieweeId)
      .single()

    return review
  } catch (error) {
    console.error("Error fetching user review:", error)
    return null
  }
}

export async function getCompanyRating(companyUserId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("user_review_stats")
      .select("*")
      .eq("user_id", companyUserId)
      .single()

    if (error) {
      // No reviews yet
      return { average_rating: 0, total_reviews: 0 }
    }

    return {
      average_rating: data.average_rating || 0,
      total_reviews: data.total_reviews || 0,
    }
  } catch (error) {
    console.error("Error fetching company rating:", error)
    return { average_rating: 0, total_reviews: 0 }
  }
}

export async function getCompanyReviews(companyUserId: string, limit: number = 10) {
  try {
    const supabase = await createClient()

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        review_text,
        created_at,
        is_edited,
        reviewer:reviewer_id (
          id
        )
      `)
      .eq("reviewee_id", companyUserId)
      .eq("is_flagged", false)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching reviews:", error)
      return []
    }

    return reviews || []
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return []
  }
}

export async function canUserReview(revieweeId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { canReview: false, reason: "Not logged in" }
    }

    if (user.id === revieweeId) {
      return { canReview: false, reason: "Cannot review yourself" }
    }

    // Check if there's a verified interaction
    const { data: interaction } = await supabase
      .from("review_interactions")
      .select("id")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .or(`user_a_id.eq.${revieweeId},user_b_id.eq.${revieweeId}`)
      .limit(1)
      .single()

    if (!interaction) {
      return {
        canReview: false,
        reason: "You must have an interaction with this company first (e.g., exchange messages)",
      }
    }

    return { canReview: true }
  } catch (error) {
    console.error("Error checking review permission:", error)
    return { canReview: false, reason: "Error checking permissions" }
  }
}
