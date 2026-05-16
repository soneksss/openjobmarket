export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

/**
 * DELETE /api/admin/users/[id]/company-profile
 *
 * Strips the company profile from a user without touching their homeowner
 * profile or auth account. Used when a homeowner claimed a seeded business
 * and needs to be reverted to homeowner-only status.
 *
 * Order of operations:
 * 1. Unclaim any seeded_trades claimed by this company (matched by name)
 * 2. Delete urgent_job_dispatch_alerts for the company
 * 3. Delete job_applications submitted by the company
 * 4. Delete the company_profile row
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const { id: userId } = await params
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 })

  const admin = createAdminClient()
  const log: string[] = []

  try {
    const { data: companyProfile, error: cpLookupErr } = await admin
      .from("company_profiles")
      .select("id, company_name")
      .eq("user_id", userId)
      .maybeSingle()

    if (cpLookupErr) throw new Error(`company_profiles lookup failed: ${cpLookupErr.message}`)
    if (!companyProfile) {
      return NextResponse.json({ error: "No company profile found for this user" }, { status: 404 })
    }

    const companyId   = companyProfile.id
    const companyName = companyProfile.company_name

    // 1. Unclaim seeded_trades (matched by company_name — no direct FK)
    if (companyName) {
      const { data: claimed, error: stErr } = await admin
        .from("seeded_trades")
        .update({ claimed: false })
        .eq("company_name", companyName)
        .eq("claimed", true)
        .select("id")
      if (stErr) log.push(`seeded_trades unclaim warning: ${stErr.message}`)
      else log.push(`seeded_trades unclaimed: ${claimed?.length ?? 0}`)
    }

    // 2. Delete dispatch alerts
    const { error: alertErr } = await admin
      .from("urgent_job_dispatch_alerts")
      .delete()
      .eq("company_id", companyId)
    if (alertErr) log.push(`dispatch_alerts warning: ${alertErr.message}`)
    else log.push("dispatch_alerts cleared")

    // 3. Delete job applications submitted by this company
    const { error: appErr } = await admin
      .from("job_applications")
      .delete()
      .eq("tradesperson_id", companyId)
    if (appErr) log.push(`job_applications warning: ${appErr.message}`)
    else log.push("job_applications cleared")

    // 4. Delete the company_profile
    const { error: deleteErr } = await admin
      .from("company_profiles")
      .delete()
      .eq("user_id", userId)
    if (deleteErr) throw new Error(`company_profiles delete failed: ${deleteErr.message}`)
    log.push("company_profile deleted")

    console.log(`[ADMIN-STRIP-COMPANY] ${userId}: ${log.join(" | ")}`)

    return NextResponse.json({
      success: true,
      userId,
      companyName,
      log,
    })

  } catch (err: any) {
    console.error("[ADMIN-STRIP-COMPANY] Fatal:", err.message, "log so far:", log)
    return NextResponse.json(
      { error: err.message ?? "Internal server error", log },
      { status: 500 }
    )
  }
}
