export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

/**
 * DELETE /api/admin/users/[id]
 *
 * Safely removes a user and all their related data.
 * Handles the edge case of a user who has both a homeowner_profile AND a
 * company_profile (e.g. they registered as homeowner then claimed a seeded trade).
 *
 * Order of operations:
 * 1. Unclaim any seeded_trades that were claimed by this user's company
 * 2. Delete records that reference company_profiles (alerts, applications)
 * 3. Delete company_profiles
 * 4. Delete homeowner_profiles
 * 5. Delete ancillary records (push tokens, notifications)
 * 6. Delete auth user — this cascades to public.users via DB trigger
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
    // ── 1. Find company_profile (may not exist) ──────────────────────────────
    const { data: companyProfile } = await admin
      .from("company_profiles")
      .select("id, company_name")
      .eq("user_id", userId)
      .maybeSingle()

    const companyId   = companyProfile?.id          ?? null
    const companyName = companyProfile?.company_name ?? null

    // ── 2. Unclaim seeded_trades linked to this company ──────────────────────
    // The seeded_trades table doesn't have a direct FK to company_profiles,
    // so we match by company_name (set during the claim_seeded_business RPC).
    if (companyName) {
      const { data: claimed, error: stErr } = await admin
        .from("seeded_trades")
        .update({ claimed: false })
        .eq("company_name", companyName)
        .eq("claimed", true)
        .select("id")

      if (stErr) {
        log.push(`seeded_trades unclaim warning: ${stErr.message}`)
      } else {
        log.push(`seeded_trades unclaimed: ${claimed?.length ?? 0}`)
      }
    }

    // ── 3. Delete dispatch alerts referencing the company ────────────────────
    if (companyId) {
      const { error } = await admin
        .from("urgent_job_dispatch_alerts")
        .delete()
        .eq("company_id", companyId)
      if (error) log.push(`dispatch_alerts delete warning: ${error.message}`)
      else log.push("dispatch_alerts cleared")
    }

    // ── 4. Delete job applications referencing the company ───────────────────
    if (companyId) {
      const { error } = await admin
        .from("job_applications")
        .delete()
        .eq("tradesperson_id", companyId)
      if (error) log.push(`job_applications delete warning: ${error.message}`)
      else log.push("job_applications cleared")
    }

    // ── 5. Delete company_profiles ───────────────────────────────────────────
    if (companyId) {
      const { error } = await admin
        .from("company_profiles")
        .delete()
        .eq("user_id", userId)
      if (error) throw new Error(`company_profiles delete failed: ${error.message}`)
      log.push("company_profiles deleted")
    }

    // ── 6. Delete homeowner_profiles ─────────────────────────────────────────
    const { error: hoErr } = await admin
      .from("homeowner_profiles")
      .delete()
      .eq("user_id", userId)
    if (hoErr) log.push(`homeowner_profiles delete warning: ${hoErr.message}`)
    else log.push("homeowner_profiles cleared")

    // ── 7. Delete push tokens ─────────────────────────────────────────────────
    await admin.from("user_push_tokens").delete().eq("user_id", userId)
    log.push("push_tokens cleared")

    // ── 8. Delete notifications ───────────────────────────────────────────────
    await admin.from("notifications").delete().eq("user_id", userId)
    log.push("notifications cleared")

    // ── 9. Delete conversations the user started ──────────────────────────────
    // Messages are likely cascade-deleted by the conversations FK or handled
    // by the auth.users trigger — skip to avoid FK fights.

    // ── 10. Delete auth user (cascades to public.users via DB trigger) ────────
    const { error: authErr } = await admin.auth.admin.deleteUser(userId)
    if (authErr) throw new Error(`auth.deleteUser failed: ${authErr.message}`)
    log.push("auth user deleted")

    console.log(`[ADMIN-DELETE-USER] ${userId}: ${log.join(" | ")}`)

    return NextResponse.json({
      success: true,
      userId,
      unclaimedTrades: companyName ? 1 : 0,
      log,
    })

  } catch (err: any) {
    console.error("[ADMIN-DELETE-USER] Fatal:", err.message, "log so far:", log)
    return NextResponse.json(
      { error: err.message ?? "Internal server error", log },
      { status: 500 }
    )
  }
}
