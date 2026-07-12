import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc("get_company_membership_status", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("[membership-status]", error.message)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("[membership-status]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
