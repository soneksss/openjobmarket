import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/server"

// ── GET — list all seeded trades (admin only) ─────────────────────────────────

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const filter = req.nextUrl.searchParams.get("filter")
  const admin  = createAdminClient()

  let query = admin
    .from("seeded_trades")
    .select("id, company_name, trade_category, address, postcode, email, phone, website, claimed, claim_token, claim_url, created_at")
    .order("created_at", { ascending: false })

  if (filter === "email") {
    query = query.eq("claimed", false).not("email", "is", null)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

// ── POST — upsert rows from CSV import ───────────────────────────────────────

interface SeededRow {
  company_name: string
  trade_category?: string | null
  address?: string | null
  postcode?: string | null
  lat?: number | null
  lng?: number | null
  email?: string | null
  phone?: string | null
  website?: string | null
}

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { rows: SeededRow[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const rows = (body.rows ?? []).filter(r => r.company_name?.trim())
  if (rows.length === 0) return NextResponse.json({ inserted: 0, skipped: 0 })

  const admin = createAdminClient()

  // Upsert — conflict on the existing unique constraint (company_name, postcode)
  const { data, error } = await admin
    .from("seeded_trades")
    .upsert(
      rows.map(r => ({
        company_name:   r.company_name.trim(),
        trade_category: r.trade_category?.trim()  || null,
        address:        r.address?.trim()         || null,
        postcode:       r.postcode?.trim()        || null,
        lat:            r.lat   != null ? Number(r.lat)  : null,
        lng:            r.lng   != null ? Number(r.lng)  : null,
        email:          r.email?.trim()           || null,
        phone:          r.phone?.trim()           || null,
        website:        r.website?.trim()         || null,
        source:         "csv_import",
      })),
      { onConflict: "company_name,postcode", ignoreDuplicates: true }
    )
    .select("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inserted = data?.length ?? 0
  const skipped  = rows.length - inserted

  return NextResponse.json({ inserted, skipped })
}
