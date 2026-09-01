import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

const MAX_SPAN = 2.0  // ~220 km — refuse absurdly large viewports
const LIMIT    = 250  // per table; combined max = 500

// A live GPS position older than this is treated as stale — the tradesperson
// falls back to their permanent business marker. Matches the matching RPCs.
const LIVE_FRESH_MS = 120_000

const COMPANY_SELECT =
  "id, company_name, industry, industries, latitude, longitude, logo_url, average_rating, reviews_count, user_id, open_for_business, service_24_7, services, location, phone_number, spoken_languages, profile_visible"

type CompanyRow = Record<string, any>

function mapCompany(c: CompanyRow, live?: { lat: number; lng: number }) {
  return {
    id:               c.id,
    profile_type:     "company" as const,
    name:             c.company_name,
    industry:         (c.industries?.[0] ?? c.industry) as string | null,
    location:         (c.location ?? null) as string | null,
    latitude:         (live ? live.lat : c.latitude) as number | null,
    longitude:        (live ? live.lng : c.longitude) as number | null,
    logo_url:         (c.logo_url ?? null) as string | null,
    rating:           (c.average_rating ?? 0) as number,
    reviews_count:    (c.reviews_count  ?? 0) as number,
    user_id:          c.user_id as string,
    open_for_business: c.open_for_business as boolean | null,
    service_24_7:     (c.service_24_7 ?? false) as boolean,
    services:         (c.services ?? null) as string[] | null,
    phone_number:     (c.phone_number ?? null) as string | null,
    spoken_languages: (c.spoken_languages ?? null) as string[] | null,
    is_live:          !!live,
    claim_token:      null as null,
  }
}

export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams
  const north = parseFloat(sp.get("north") ?? "")
  const south = parseFloat(sp.get("south") ?? "")
  const east  = parseFloat(sp.get("east")  ?? "")
  const west  = parseFloat(sp.get("west")  ?? "")

  if ([north, south, east, west].some(isNaN) || south >= north || west >= east) {
    return NextResponse.json([], { status: 400 })
  }
  if (north - south > MAX_SPAN || east - west > MAX_SPAN) {
    return NextResponse.json([], { status: 400 })
  }

  // Decode _AND_ placeholder (client sends it to avoid %26 which confuses Turbopack routing)
  const industry = (sp.get("industry") || null)?.replace(/_AND_/g, " & ") ?? null
  const language = sp.get("language") || null
  const industryTerm = industry ? industry.replace(/"/g, "") : null

  const admin = createAdminClient()

  const applyFilters = (q: any) => {
    if (industryTerm) {
      q = q.or(`industry.ilike.%${industryTerm}%,industries.cs.{"${industryTerm}"},company_name.ilike.%${industryTerm}%`)
    }
    if (language) q = q.contains("spoken_languages", [language])
    return q
  }

  // ── Company profiles inside the viewport (by permanent business location) ──
  let cq = admin
    .from("company_profiles")
    .select(COMPANY_SELECT)
    .gte("latitude", south).lte("latitude", north)
    .gte("longitude", west).lte("longitude", east)
    .or("profile_visible.is.null,profile_visible.eq.true")
    .limit(LIMIT)
  cq = applyFilters(cq)

  // ── Seeded trades ─────────────────────────────────────────────────────────
  let sq = admin
    .from("seeded_trades")
    .select("id, company_name, trade_category, normalised_categories, lat, lng, phone, address, postcode, claim_token")
    .eq("claimed", false)
    .gte("lat", south).lte("lat", north)
    .gte("lng", west).lte("lng", east)
    .limit(LIMIT)
  if (industryTerm) {
    sq = sq.or(`normalised_categories.cs.{"${industryTerm}"},trade_category.ilike.%${industryTerm}%`)
  }

  // ── Live positions ("Available now" tradespeople) inside the viewport ─────
  const liveCutoff = new Date(Date.now() - LIVE_FRESH_MS).toISOString()
  const liq = admin
    .from("tradesperson_live_locations")
    .select("company_id, latitude, longitude")
    .eq("is_active", true)
    .gte("updated_at", liveCutoff)
    .gte("latitude", south).lte("latitude", north)
    .gte("longitude", west).lte("longitude", east)
    .limit(LIMIT)

  const [{ data: companies }, { data: seeded }, { data: adminRows }, { data: liveRows }] = await Promise.all([
    cq,
    sq,
    admin.from("admin_users").select("user_id"),
    liq,
  ])

  // Admins are never shown on the public map, regardless of their profile settings.
  const adminUserIds = new Set((adminRows ?? []).map((r: { user_id: string }) => r.user_id))

  // company_id -> fresh live position
  const liveMap = new Map<string, { lat: number; lng: number }>()
  for (const r of liveRows ?? []) {
    if (r.company_id && r.latitude != null && r.longitude != null) {
      liveMap.set(r.company_id, { lat: r.latitude, lng: r.longitude })
    }
  }

  const inViewport = (companies ?? []).filter(c => !adminUserIds.has(c.user_id))
  const seenIds = new Set(inViewport.map(c => c.id))

  // Live tradespeople whose BUSINESS pin is outside the viewport but whose van
  // is inside it — fetch their profiles and add them at their live position.
  const missingLiveIds = [...liveMap.keys()].filter(id => !seenIds.has(id))
  let extraLive: CompanyRow[] = []
  if (missingLiveIds.length > 0) {
    let eq = admin
      .from("company_profiles")
      .select(COMPANY_SELECT)
      .in("id", missingLiveIds)
      .or("profile_visible.is.null,profile_visible.eq.true")
    eq = applyFilters(eq)
    const { data } = await eq
    extraLive = (data ?? []).filter(c => !adminUserIds.has(c.user_id))
  }

  const companyRows = [
    ...inViewport.map(c => mapCompany(c, liveMap.get(c.id))),
    ...extraLive.map(c => mapCompany(c, liveMap.get(c.id))),
  ]

  // Names already covered by a real company profile — seeded rows with the same
  // name are duplicates and should be suppressed.
  const companyNames = new Set(companyRows.map(c => c.name?.trim().toLowerCase()).filter(Boolean))

  const seededRows = (seeded ?? [])
    .filter(s => !companyNames.has(s.company_name?.trim().toLowerCase()))
    .map(s => ({
      id:               s.id,
      profile_type:     "seeded" as const,
      name:             s.company_name,
      industry:         (s.trade_category ?? null) as string | null,
      normalised_categories: (s.normalised_categories ?? null) as string[] | null,
      location:         ((s.address ?? s.postcode) ?? null) as string | null,
      latitude:         s.lat  as number | null,
      longitude:        s.lng  as number | null,
      logo_url:         null as null,
      rating:           0,
      reviews_count:    0,
      user_id:          null as null,
      open_for_business: true as boolean,
      service_24_7:     false as boolean,
      services:         null as null,
      phone_number:     (s.phone ?? null) as string | null,
      is_live:          false,
      claim_token:      s.claim_token as string,
    }))

  // Also deduplicate within each source by id (guard against DB-level dupes)
  const seen = new Set<string>()
  const traders = [...companyRows, ...seededRows].filter(t => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })

  return NextResponse.json(traders, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
    },
  })
}
