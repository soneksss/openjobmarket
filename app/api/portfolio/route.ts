import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// POST /api/portfolio
// Body: { photo_url: string, storage_path: string }
// Inserts a portfolio photo record after the client has uploaded to storage.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { photo_url, storage_path } = await req.json() as { photo_url: string; storage_path: string }
    if (!photo_url || !storage_path) {
      return NextResponse.json({ error: "photo_url and storage_path are required" }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    // Enforce max 6 photos and get current count for display_order
    const { count } = await supabase
      .from("trades_portfolio_photos")
      .select("*", { count: "exact", head: true })
      .eq("tradesperson_id", profile.id)

    if ((count ?? 0) >= 6) {
      return NextResponse.json({ error: "Maximum 6 portfolio photos allowed" }, { status: 422 })
    }

    const { data, error } = await supabase
      .from("trades_portfolio_photos")
      .insert({ tradesperson_id: profile.id, photo_url, storage_path, display_order: (count ?? 0) + 1 })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ photo: data })
  } catch (err) {
    console.error("[PORTFOLIO] POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
