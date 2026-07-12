import { type NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const code = typeof body?.code === "string" ? body.code.trim() : ""

    if (!code) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc("redeem_promo_code", {
      p_user_id: user.id,
      p_code: code,
    })

    if (error) {
      console.error("[redeem-promo-code]", error.message)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    if (!data?.success) {
      return NextResponse.json({ error: data?.error ?? "Unable to redeem promo code" }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("[redeem-promo-code]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
