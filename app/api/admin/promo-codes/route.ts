import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

/**
 * GET /api/admin/promo-codes
 *
 * Lists all promo codes with their usage counts, newest first.
 */
export async function GET() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("promo_codes")
      .select("*, membership_plans(key, name)")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[ADMIN-PROMO-CODES] GET error", error.message)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json({ promoCodes: data ?? [] })
  } catch (err) {
    console.error("[ADMIN-PROMO-CODES] GET error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/promo-codes
 *
 * Creates a new promo code.
 * Body: { code, description?, expires_at?, max_uses?, membership_plan_id?,
 *          free_days?, percent_discount?, fixed_discount_pence?, region?,
 *          new_users_only?, existing_members_allowed?, is_active? }
 */
export async function POST(request: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : ""

    if (!code) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("promo_codes")
      .insert({
        code,
        description: body.description ?? null,
        is_active: body.is_active ?? true,
        expires_at: body.expires_at ?? null,
        max_uses: body.max_uses ?? null,
        membership_plan_id: body.membership_plan_id ?? null,
        free_days: body.free_days ?? 0,
        percent_discount: body.percent_discount ?? null,
        fixed_discount_pence: body.fixed_discount_pence ?? null,
        region: body.region ?? null,
        new_users_only: body.new_users_only ?? false,
        existing_members_allowed: body.existing_members_allowed ?? true,
        created_by: adminUser.user_id,
      })
      .select()
      .single()

    if (error) {
      const isDuplicate = error.code === "23505"
      return NextResponse.json(
        { error: isDuplicate ? "A promo code with this code already exists" : error.message },
        { status: isDuplicate ? 409 : 500 }
      )
    }

    return NextResponse.json({ success: true, promoCode: data })
  } catch (err) {
    console.error("[ADMIN-PROMO-CODES] POST error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
