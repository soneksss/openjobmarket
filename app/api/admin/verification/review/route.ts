import { createClient, createAdminClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/admin/verification/review
 * Body: {
 *   companyId: string,
 *   decisions: { type: "business"|"company_registration"|"insurance",
 *                decision: "approve"|"reject"|"revoke"|"pending",
 *                expiresAt?: string, reason?: string, evidence?: string }[],
 *   adminNotes?: string,          // internal only
 *   rejectionReason?: string      // shown to the tradesperson, not the public
 * }
 *
 * Double-gated: getAdminUser() here + the SECURITY DEFINER RPC re-checks
 * admin_users. A tradesperson calling the RPC directly is rejected.
 */
export async function POST(request: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const { companyId, decisions, adminNotes, rejectionReason } = body ?? {}
  if (!companyId || !Array.isArray(decisions)) {
    return NextResponse.json({ error: "companyId and decisions[] required" }, { status: 400 })
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const results: any[] = []

  for (const d of decisions) {
    if (!d?.type || !d?.decision) continue
    const { data, error } = await supabase.rpc("admin_review_verification_item", {
      p_company_id: companyId,
      p_type: d.type,
      p_decision: d.decision,
      p_expires_at: d.expiresAt || null,
      p_reason: d.reason || null,
      p_evidence: d.evidence || null,
    })
    if (error) {
      console.error("[ADMIN-VERIFICATION-REVIEW]", d.type, error.message)
      return NextResponse.json({ error: error.message, failedType: d.type }, { status: 400 })
    }
    results.push(data)
  }

  // Internal notes / tradesperson-facing rejection reason on the envelope.
  if (adminNotes !== undefined || rejectionReason !== undefined) {
    const patch: Record<string, any> = { reviewed_at: new Date().toISOString(), reviewed_by: adminUser.user_id }
    if (adminNotes !== undefined) patch.admin_notes = adminNotes || null
    if (rejectionReason !== undefined) patch.rejection_reason = rejectionReason || null
    const { error: noteErr } = await admin
      .from("company_verification")
      .update(patch)
      .eq("company_id", companyId)
    if (noteErr) console.error("[ADMIN-VERIFICATION-REVIEW] notes update:", noteErr.message)
  }

  return NextResponse.json({ success: true, results })
}
