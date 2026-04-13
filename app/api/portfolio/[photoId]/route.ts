import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// DELETE /api/portfolio/[photoId]
// Deletes the portfolio photo from storage and the DB record.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Fetch photo + verify ownership via join
    const { data: photo } = await supabase
      .from("trades_portfolio_photos")
      .select("id, storage_path, company_profiles!tradesperson_id(user_id)")
      .eq("id", photoId)
      .single()

    if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if ((photo as any).company_profiles?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Remove from storage (fire and forget — don't block on error)
    supabase.storage.from("trades-portfolio").remove([photo.storage_path]).catch(console.error)

    // Delete DB record
    const { error } = await supabase
      .from("trades_portfolio_photos")
      .delete()
      .eq("id", photoId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[PORTFOLIO] DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
