import { createClient, createAdminClient, createAdminWriteClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

// ── GET /api/jobs — viewport-based map loading ──────────────────────────────
const MAX_SPAN = 2.0  // ~220 km — refuse absurdly large viewports
const MAP_LIMIT = 200

export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams
  const north = parseFloat(sp.get("north") ?? "")
  const south = parseFloat(sp.get("south") ?? "")
  const east  = parseFloat(sp.get("east")  ?? "")
  const west  = parseFloat(sp.get("west")  ?? "")

  if ([north, south, east, west].some(isNaN) || south >= north || west >= east)
    return NextResponse.json([], { status: 400 })
  if (north - south > MAX_SPAN || east - west > MAX_SPAN)
    return NextResponse.json([], { status: 400 })

  const industry = sp.get("industry") || null
  const budget   = sp.get("budget")   || null
  const urgency  = sp.get("urgency")  || null

  const admin = createAdminClient()

  let q = admin
    .from("jobs")
    .select(
      "id, title, short_description, location, latitude, longitude, " +
      "latitude_approx, longitude_approx, location_type, " +
      "budget_min, budget_max, urgency_type, job_photo_url, industry, category, " +
      "created_at, " +
      "homeowner_profiles!homeowner_id(first_name, last_name, profile_photo_url, user_id)"
    )
    .eq("status", "POSTED")
    .eq("is_active", true)
    .eq("is_tradespeople_job", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    // match approx coords if available, otherwise exact coords
    .or(
      `and(latitude_approx.gte.${south},latitude_approx.lte.${north},longitude_approx.gte.${west},longitude_approx.lte.${east}),` +
      `and(latitude_approx.is.null,latitude.gte.${south},latitude.lte.${north},longitude.gte.${west},longitude.lte.${east})`
    )
    .order("created_at", { ascending: false })
    .limit(MAP_LIMIT)

  if (industry) {
    const kw = industry.split(/[\s&,/]+/).find((w: string) => w.length > 3) || industry
    q = (q as any).or(`industry.ilike.%${kw}%,industry.is.null`)
  }
  if (urgency) q = (q as any).eq("urgency_type", urgency)
  if (budget === "0-500")      q = (q as any).lte("budget_max", 500)
  else if (budget === "500-1k") q = (q as any).gte("budget_min", 500).lte("budget_max", 1000)
  else if (budget === "1k-5k")  q = (q as any).gte("budget_min", 1000).lte("budget_max", 5000)
  else if (budget === "5k+")    q = (q as any).gte("budget_min", 5000)

  const { data } = await q

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" },
  })
}

/**
 * POST /api/jobs
 *
 * Server-side job creation using the admin (service_role) client.
 * Bypasses all RLS subquery overhead that caused client-side INSERT hangs.
 *
 * Flow:
 *   1. Authenticate caller via server-side cookie auth
 *   2. Verify the claimed homeowner_id / company_id belongs to this user
 *   3. Insert with admin client (no RLS) — fast, no subquery cost
 *   4. Return { jobId }
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ─────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json()

    // ── 2. Verify ownership ──────────────────────────────────────
    const { homeowner_id, company_id } = payload

    if (homeowner_id) {
      const { data: hp } = await supabase
        .from("homeowner_profiles")
        .select("id")
        .eq("id", homeowner_id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (!hp) {
        return NextResponse.json({ error: "Not authorized for this homeowner profile" }, { status: 403 })
      }
    } else if (company_id) {
      const { data: cp } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("id", company_id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (!cp) {
        return NextResponse.json({ error: "Not authorized for this company profile" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Missing homeowner_id or company_id" }, { status: 400 })
    }

    // ── 3. Insert with admin write client (bypasses RLS, no safeFetch fallback) ─
    // Strip only legacy client-sent values that we recompute server-side.
    const { latitude_approx: _la, longitude_approx: _lo, ...safePayload } = payload

    const admin = createAdminWriteClient()
    const { error: insertError } = await admin
      .from("jobs")
      .insert(safePayload)

    if (insertError) {
      console.error("[POST /api/jobs] Insert error:", insertError.message, {
        code:    insertError.code,
        details: (insertError as any).details,
        hint:    (insertError as any).hint,
      })
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    revalidateTag(`jobs-user-${user.id}`)
    console.log("[POST /api/jobs] Job created:", payload.id)

    // ── 4. Post-insert: geocode + compute approx coords ─────────────────────
    // Run as a single update after creation so we never block the insert.
    ;(async () => {
      try {
        let lat: number | null = payload.latitude ?? null
        let lng: number | null = payload.longitude ?? null

        // Server-side geocoding fallback
        if (!lat && payload.location) {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(payload.location)}&limit=1&countrycodes=gb,us,de,fr,br`,
            { headers: { "User-Agent": "OpenJobMarket/1.0" } }
          )
          const geoData = await geoRes.json()
          if (geoData.length > 0) {
            lat = parseFloat(geoData[0].lat)
            lng = parseFloat(geoData[0].lon)
            console.log("[POST /api/jobs] Geocoded:", payload.location, "→", lat, lng)
          }
        }

        if (lat !== null && lng !== null) {
          const locationType: string = payload.location_type ?? 'exact'
          let latApprox: number
          let lngApprox: number

          if (locationType === 'approx') {
            // User already chose an approximate point — no further offset needed
            latApprox = lat
            lngApprox = lng
          } else {
            // Exact address — offset by 300–500 m for privacy on the public map
            const angle  = Math.random() * 2 * Math.PI
            const radius = 0.003 + Math.random() * 0.002  // ~330–550 m in degrees
            latApprox = lat + radius * Math.sin(angle)
            lngApprox = lng + radius * Math.cos(angle)
          }

          await admin.from("jobs").update({
            latitude:         lat,
            longitude:        lng,
            latitude_approx:  latApprox,
            longitude_approx: lngApprox,
          } as any).eq("id", payload.id)
        }
      } catch (err) {
        console.warn("[POST /api/jobs] Post-insert geocode/approx failed (non-fatal):", err)
      }
    })()

    return NextResponse.json({ success: true, jobId: payload.id })

  } catch (err: any) {
    console.error("[POST /api/jobs] Unexpected error:", err)
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 })
  }
}
