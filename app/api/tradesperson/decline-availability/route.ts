import { type NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Turn off and clear availability_expires_at so the cron never prompts again
    // until the trader manually re-enables availability from their dashboard.
    const { error } = await admin
      .from("company_profiles")
      .update({
        open_for_business:   false,
        availability_expires_at: null,
        last_availability_prompt_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (error) {
      console.error("[decline-availability]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[decline-availability]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
