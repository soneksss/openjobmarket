import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

/**
 * PATCH /api/admin/membership-plans/[id]
 *
 * Edits a membership plan's name/price/features — e.g. the £10/£20 "Coming
 * Soon" Founding Member future-pricing defaults shown while Launch Mode is on.
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
    const editable = ["name", "price_pence", "billing_interval", "map_marker_color", "features", "sort_order", "is_active"] as const
    for (const key of editable) {
      if (key in body) updates[key] = body[key]
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("membership_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, plan: data })
  } catch (err) {
    console.error("[ADMIN-MEMBERSHIP-PLAN] PATCH error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
