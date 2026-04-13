import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/portfolio/reorder
// Body: { orderedIds: string[] }  — full ordered list of photo IDs
// Updates display_order for each photo in a single transaction.
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { orderedIds } = await req.json() as { orderedIds: string[] }
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds array required" }, { status: 400 })
    }

    // Verify all photos belong to this user's profile
    const { data: profile } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    const { count } = await supabase
      .from("trades_portfolio_photos")
      .select("*", { count: "exact", head: true })
      .eq("tradesperson_id", profile.id)
      .in("id", orderedIds)

    if ((count ?? 0) !== orderedIds.length) {
      return NextResponse.json({ error: "One or more photos not found or not owned by you" }, { status: 403 })
    }

    // Update display_order for each photo
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase
          .from("trades_portfolio_photos")
          .update({ display_order: idx + 1 })
          .eq("id", id)
      )
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[PORTFOLIO] PATCH reorder error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
