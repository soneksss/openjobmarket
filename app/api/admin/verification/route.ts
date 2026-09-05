import { createAdminClient } from "@/lib/server"
import { getAdminUser } from "@/lib/admin-auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/admin/verification?status=pending|all
 * Lists company verification requests with everything an admin needs to review:
 * the request envelope, per-category items, and the relevant company_profiles
 * fields (business info, insurance summary, links, portfolio hints).
 * The insurance certificate itself is fetched separately via
 * /api/company/insurance-document?companyId=… (owner-or-admin gated).
 */
export async function GET(request: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const statusFilter = request.nextUrl.searchParams.get("status") ?? "pending"
  const admin = createAdminClient()

  let q = admin
    .from("company_verification")
    .select("id, company_id, status, requested_at, reviewed_at, reviewed_by, rejection_reason, admin_notes, created_at, updated_at")
    .order("requested_at", { ascending: true, nullsFirst: false })

  if (statusFilter !== "all") q = q.eq("status", statusFilter)

  const { data: envelopes, error } = await q
  if (error) {
    console.error("[ADMIN-VERIFICATION] list error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const companyIds = (envelopes ?? []).map((e) => e.company_id)
  if (companyIds.length === 0) return NextResponse.json({ requests: [] })

  const [{ data: companies }, { data: items }] = await Promise.all([
    admin
      .from("company_profiles")
      .select(
        "id, user_id, company_name, industry, industries, location, business_type, " +
        "company_registration_number, registered_address, website_url, google_maps_url, facebook_url, " +
        "phone_number, contact_email, insurance_provider, insurance_policy_type, insurance_cover_amount, " +
        "insurance_expiry_date, insurance_document_path, logo_url, average_rating, reviews_count",
      )
      .in("id", companyIds),
    admin
      .from("company_verification_items")
      .select("company_id, type, status, verified_at, expires_at, verified_by, evidence_reference, rejection_reason")
      .in("company_id", companyIds),
  ])

  const companyById = new Map(((companies ?? []) as any[]).map((c) => [c.id, c]))
  const itemsByCompany = new Map<string, any[]>()
  for (const it of (items ?? []) as any[]) {
    const arr = itemsByCompany.get(it.company_id) ?? []
    arr.push(it)
    itemsByCompany.set(it.company_id, arr)
  }

  const requests = (envelopes ?? []).map((e) => ({
    ...e,
    company: companyById.get(e.company_id) ?? null,
    items: itemsByCompany.get(e.company_id) ?? [],
  }))

  return NextResponse.json({ requests })
}
