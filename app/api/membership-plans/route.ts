import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

/**
 * GET /api/membership-plans
 *
 * Public list of active membership plans, ordered for display. Used by the
 * Billing page and the landing page pricing section so prices/features live
 * in the DB (membership_plans) rather than being hardcoded in the UI.
 */
export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("membership_plans")
      .select("id, key, name, price_pence, billing_interval, map_marker_color, features, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("[membership-plans]", error.message)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json({ plans: data ?? [] })
  } catch (err) {
    console.error("[membership-plans]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
