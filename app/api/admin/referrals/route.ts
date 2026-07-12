import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

/**
 * GET /api/admin/referrals
 *
 * Lists all referrals (pending + completed) with referrer/referred company
 * names, newest first, for the admin Marketing → Referral Programme view.
 */
export async function GET() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("referrals")
      .select(`
        id, referral_code, status,
        referrer_reward_days, referred_reward_days,
        referrer_rewarded_at, referred_rewarded_at, created_at,
        referrer:referrer_company_id ( company_name ),
        referred:referred_company_id ( company_name )
      `)
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      console.error("[ADMIN-REFERRALS] GET error", error.message)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    const completed = (data ?? []).filter(r => r.status === "completed").length

    return NextResponse.json({
      referrals: data ?? [],
      stats: { total: data?.length ?? 0, completed, pending: (data?.length ?? 0) - completed },
    })
  } catch (err) {
    console.error("[ADMIN-REFERRALS] GET error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
