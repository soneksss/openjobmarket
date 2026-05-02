import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

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

    // ── 3. Insert with admin client (bypasses RLS) ───────────────
    const admin = createAdminClient()
    const { error: insertError } = await admin
      .from("jobs")
      .insert(payload)

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

    // Server-side geocoding: if client didn't resolve coordinates, do it now
    if (!payload.latitude && payload.location) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(payload.location)}&limit=1&countrycodes=gb,us,de,fr,br`,
          { headers: { "User-Agent": "OpenJobMarket/1.0" } }
        )
        const geoData = await geoRes.json()
        if (geoData.length > 0) {
          await admin.from("jobs").update({
            latitude: parseFloat(geoData[0].lat),
            longitude: parseFloat(geoData[0].lon),
          }).eq("id", payload.id)
          console.log("[POST /api/jobs] Geocoded:", payload.location, "→", geoData[0].lat, geoData[0].lon)
        }
      } catch (geoErr) {
        console.warn("[POST /api/jobs] Geocoding failed (non-fatal):", geoErr)
      }
    }

    return NextResponse.json({ success: true, jobId: payload.id })

  } catch (err: any) {
    console.error("[POST /api/jobs] Unexpected error:", err)
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 })
  }
}
