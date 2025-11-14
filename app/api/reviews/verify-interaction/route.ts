import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/reviews/verify-interaction
 * Manually verify an interaction between two users
 * Body: { userBId, interactionType?, conversationId? }
 * This can be called when:
 * - A job application is accepted/responded to
 * - A service request is completed
 * - Any other verified interaction occurs
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
    const { userBId, interactionType = "interaction", conversationId } = body

    if (!userBId) {
      return NextResponse.json({ error: "userBId is required" }, { status: 400 })
    }

    if (user.id === userBId) {
      return NextResponse.json({ error: "Cannot verify interaction with yourself" }, { status: 400 })
    }

    // Create verified interaction
    const { data, error } = await supabase
      .from("review_interactions")
      .insert({
        user_a_id: user.id < userBId ? user.id : userBId,
        user_b_id: user.id > userBId ? user.id : userBId,
        interaction_type: interactionType,
        conversation_id: conversationId || null,
      })
      .select()
      .single()

    if (error) {
      // If interaction already exists, that's okay
      if (error.code === "23505") {
        return NextResponse.json(
          {
            message: "Interaction already verified",
            canReview: true,
          },
          { status: 200 }
        )
      }

      console.error("[API] Error verifying interaction:", error)
      return NextResponse.json({ error: "Failed to verify interaction" }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: "Interaction verified successfully",
        interaction: data,
        canReview: true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] Unexpected error in POST /api/reviews/verify-interaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/reviews/verify-interaction
 * Check if interaction between current user and another user is verified
 * Query params: userId (required)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Check if interaction exists
    const { data: canReview, error } = await supabase.rpc("can_user_review", {
      p_reviewer_id: user.id,
      p_reviewee_id: userId,
    })

    if (error) {
      console.error("[API] Error checking interaction:", error)
      return NextResponse.json({ error: "Failed to check interaction" }, { status: 500 })
    }

    return NextResponse.json(
      {
        canReview: !!canReview,
        hasInteraction: !!canReview,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[API] Unexpected error in GET /api/reviews/verify-interaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
