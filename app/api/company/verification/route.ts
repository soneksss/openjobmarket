import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"

/**
 * GET  /api/company/verification  → the caller's own verification envelope + items.
 * POST /api/company/verification  → submit (or re-submit) a verification request.
 *
 * Owner-scoped via RLS + a SECURITY DEFINER request RPC. A tradesperson can
 * never set their own status to "verified" — only an admin can.
 */

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: company } = await supabase
    .from("company_profiles")
    .select("id, business_type, company_registration_number, insurance_document_path")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!company) return NextResponse.json({ error: "No company profile" }, { status: 404 })

  const [{ data: envelope }, { data: items }] = await Promise.all([
    supabase
      .from("company_verification")
      .select("status, requested_at, reviewed_at, rejection_reason")
      .eq("company_id", company.id)
      .maybeSingle(),
    supabase
      .from("company_verification_items")
      .select("type, status, verified_at, expires_at, rejection_reason")
      .eq("company_id", company.id),
  ])

  return NextResponse.json({
    status: envelope?.status ?? "not_requested",
    requested_at: envelope?.requested_at ?? null,
    reviewed_at: envelope?.reviewed_at ?? null,
    rejection_reason: envelope?.rejection_reason ?? null,
    items: items ?? [],
    // lightweight hints so the section can tell the user what will be reviewed
    hasInsuranceDoc: !!company.insurance_document_path,
    isLimitedCompany: company.business_type === "limited_company",
    hasRegNumber: !!company.company_registration_number,
  })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase.rpc("request_company_verification")
  if (error) {
    console.error("[COMPANY-VERIFICATION] request error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (data && data.ok === false) {
    return NextResponse.json({ error: data.error ?? "request_failed" }, { status: 409 })
  }
  return NextResponse.json({ success: true, status: "pending" })
}
