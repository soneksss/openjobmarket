import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

/**
 * GET /api/admin/promo-codes/[id]
 *
 * Returns a promo code plus its full redemption history (which companies
 * redeemed it, and when).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const { id } = await params
    const admin = createAdminClient()

    const [promoResult, redemptionsResult] = await Promise.all([
      admin.from("promo_codes").select("*, membership_plans(key, name)").eq("id", id).maybeSingle(),
      admin
        .from("promo_code_redemptions")
        .select("id, redeemed_at, free_days_granted, company_profiles(company_name)")
        .eq("promo_code_id", id)
        .order("redeemed_at", { ascending: false }),
    ])

    if (!promoResult.data) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 })
    }

    return NextResponse.json({
      promoCode: promoResult.data,
      redemptions: redemptionsResult.data ?? [],
    })
  } catch (err) {
    console.error("[ADMIN-PROMO-CODE] GET error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/promo-codes/[id]
 *
 * Updates any editable field on a promo code (including toggling is_active).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const editable = [
      "code", "description", "is_active", "expires_at", "max_uses",
      "membership_plan_id", "free_days", "percent_discount", "fixed_discount_pence",
      "region", "new_users_only", "existing_members_allowed",
    ] as const

    for (const key of editable) {
      if (key in body) {
        updates[key] = key === "code" && typeof body.code === "string"
          ? body.code.trim().toUpperCase()
          : body[key]
      }
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("promo_codes")
      .update(updates)
      .eq("id", id)
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
    console.error("[ADMIN-PROMO-CODE] PATCH error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/promo-codes/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const { id } = await params
    const admin = createAdminClient()
    const { error } = await admin.from("promo_codes").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[ADMIN-PROMO-CODE] DELETE error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
