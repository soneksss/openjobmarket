import { type NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/server"
import { nextNineAM } from "@/lib/availability"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()
    const now = new Date().toISOString()
    const expiresAt = nextNineAM().toISOString()

    const { error } = await admin
      .from("company_profiles")
      .update({
        open_for_business: true,
        last_availability_confirmed_at: now,
        availability_expires_at: expiresAt,
        availability_last_updated_at: now,
        urgent_notifications_enabled: true,
        urgent_notifications_expires_at: expiresAt,
      })
      .eq("user_id", user.id)

    if (error) {
      console.error("[confirm-availability]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, expires_at: expiresAt })
  } catch (err) {
    console.error("[confirm-availability]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
