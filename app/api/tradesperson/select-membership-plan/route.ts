import { type NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/server"

/**
 * POST /api/tradesperson/select-membership-plan
 *
 * Records which membership plan a tradesperson wants (Passive/Active).
 * No payment is taken — this only sets company_profiles.membership_plan_id
 * so the selection is ready to go the moment a payment processor is wired up.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const planKey = typeof body?.plan_key === "string" ? body.plan_key.trim() : ""

    if (!planKey) {
      return NextResponse.json({ error: "plan_key is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: plan, error: planError } = await admin
      .from("membership_plans")
      .select("id")
      .eq("key", planKey)
      .eq("is_active", true)
      .maybeSingle()

    if (planError || !plan) {
      return NextResponse.json({ error: "Unknown membership plan" }, { status: 400 })
    }

    const { error } = await admin
      .from("company_profiles")
      .update({ membership_plan_id: plan.id, membership_plan_selected_at: new Date().toISOString() })
      .eq("user_id", user.id)

    if (error) {
      console.error("[select-membership-plan]", error.message)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[select-membership-plan]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
