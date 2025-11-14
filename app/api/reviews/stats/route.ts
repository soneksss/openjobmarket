import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/reviews/stats
 * Fetch review statistics for a specific user
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

    // Fetch stats from the view
    const { data: stats, error } = await supabase
      .from("user_review_stats")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error) {
      // If no stats found (no reviews yet), return zeros
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            stats: {
              total_reviews: 0,
              average_rating: 0,
              five_star_count: 0,
              four_star_count: 0,
              three_star_count: 0,
              two_star_count: 0,
              one_star_count: 0,
            },
          },
          { status: 200 }
        )
      }

      console.error("[API] Error fetching review stats:", error)
      return NextResponse.json({ error: "Failed to fetch review statistics" }, { status: 500 })
    }

    return NextResponse.json({ stats }, { status: 200 })
  } catch (error) {
    console.error("[API] Unexpected error in GET /api/reviews/stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
