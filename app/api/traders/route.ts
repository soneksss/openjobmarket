import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/server"

const MAX_SPAN = 2.0  // ~220 km — refuse absurdly large viewports
const LIMIT    = 250  // per table; combined max = 500

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

  const industry = sp.get("industry") || null
  const language = sp.get("language") || null

  const admin = createAdminClient()

  // ── Company profiles ──────────────────────────────────────────────────────
  let cq = admin
    .from("company_profiles")
    .select(
      "id, company_name, industry, industries, latitude, longitude, " +
      "logo_url, average_rating, reviews_count, user_id, " +
      "open_for_business, service_24_7, services, location, phone_number"
    )
    .gte("latitude", south).lte("latitude", north)
    .gte("longitude", west).lte("longitude", east)
    .limit(LIMIT)

  if (industry) cq = cq.or(`industry.ilike.%${industry}%,company_name.ilike.%${industry}%`)
  if (language) cq = (cq as any).contains("spoken_languages", [language])

  // ── Seeded trades ─────────────────────────────────────────────────────────
  let sq = admin
    .from("seeded_trades")
    .select("id, company_name, trade_category, lat, lng, phone, address, postcode, claim_token")
    .eq("claimed", false)
    .gte("lat", south).lte("lat", north)
    .gte("lng", west).lte("lng", east)
    .limit(LIMIT)

  if (industry) sq = (sq as any).contains("normalised_categories", [industry])

  const [{ data: companies }, { data: seeded }] = await Promise.all([cq, sq])

  const traders = [
    ...(companies ?? []).map(c => ({
      id:               c.id,
      profile_type:     "company" as const,
      name:             c.company_name,
      industry:         (c.industries?.[0] ?? c.industry) as string | null,
      location:         (c.location ?? null) as string | null,
      latitude:         c.latitude  as number | null,
      longitude:        c.longitude as number | null,
      logo_url:         (c.logo_url ?? null) as string | null,
      rating:           (c.average_rating ?? 0) as number,
      reviews_count:    (c.reviews_count  ?? 0) as number,
      user_id:          c.user_id as string,
      open_for_business: c.open_for_business as boolean | null,
      service_24_7:     (c.service_24_7 ?? false) as boolean,
      services:         (c.services ?? null) as string[] | null,
      phone_number:     (c.phone_number ?? null) as string | null,
      claim_token:      null as null,
    })),
    ...(seeded ?? []).map(s => ({
      id:               s.id,
      profile_type:     "seeded" as const,
      name:             s.company_name,
      industry:         (s.trade_category ?? null) as string | null,
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
      claim_token:      s.claim_token as string,
    })),
  ]

  return NextResponse.json(traders, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  })
}
