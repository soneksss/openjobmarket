import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/tradesperson/live-location
 *
 * Driven only by components/trades-live-location.tsx while "Available now" is ON.
 *
 * Body:
 *   { lat, lng }        → upsert the caller's live position (is_active = true)
 *   { deactivate: true } → mark the caller's live row inactive
 *
 * Never writes company_profiles.latitude/longitude (the permanent business
 * location). RLS on tradesperson_live_locations enforces per-user ownership;
 * this handler adds the "must currently be Available now" gate.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({} as any))

    // Resolve the caller's tradesperson (company) profile + availability state
    const { data: profile } = await supabase
      .from("company_profiles")
      .select("id, urgent_notifications_enabled, urgent_notifications_expires_at")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!profile?.id) {
      return NextResponse.json({ error: "Not a tradesperson account" }, { status: 403 })
    }

    // ── Deactivate ──────────────────────────────────────────────────────────
    if (body?.deactivate === true) {
      await supabase
        .from("tradesperson_live_locations")
        .update({ is_active: false })
        .eq("company_id", profile.id)
      return NextResponse.json({ success: true, active: false })
    }

    // ── Gate: must currently be "Available now" ─────────────────────────────
    const expiry = profile.urgent_notifications_expires_at
    const availableNow =
      !!profile.urgent_notifications_enabled && (!expiry || new Date(expiry) > new Date())

    if (!availableNow) {
      // Tell the client to stop; make sure any stale row is inactive.
      await supabase
        .from("tradesperson_live_locations")
        .update({ is_active: false })
        .eq("company_id", profile.id)
        .eq("is_active", true)
      return NextResponse.json({ active: false })
    }

    // ── Upsert live position ───────────────────────────────────────────────
    const lat = Number(body?.lat)
    const lng = Number(body?.lng)
    if (
      !isFinite(lat) || !isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      // Invalid coords — leave the existing row untouched.
      return NextResponse.json({ error: "Valid lat/lng required" }, { status: 400 })
    }

    const { error: upErr } = await supabase
      .from("tradesperson_live_locations")
      .upsert(
        {
          company_id: profile.id,
          user_id:    user.id,
          latitude:   lat,
          longitude:  lng,
          is_active:  true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      )

    if (upErr) {
      console.error("[LIVE-LOCATION] upsert error:", upErr.message)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, active: true })
  } catch (error) {
    console.error("[LIVE-LOCATION] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
