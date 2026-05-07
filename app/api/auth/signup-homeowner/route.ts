import { createAdminWriteClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/auth/signup-homeowner
 *
 * Creates a homeowner account with email pre-confirmed (no OTP required).
 * Uses the service-role admin client — never expose this to unauthenticated
 * arbitrary input without validation (done below).
 *
 * Body: { email, password, firstName, lastName, postcode, phone?, location, latitude, longitude }
 * Returns: { success: true }
 * Client must then call supabase.auth.signInWithPassword() to establish the session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, postcode, phone, location, latitude, longitude } = body as {
      email: string
      password: string
      firstName: string
      lastName: string
      postcode: string
      phone?: string
      location?: string
      latitude?: number | null
      longitude?: number | null
    }

    // ── Validation ────────────────────────────────────────────────────────────
    if (!email || !password || !firstName || !lastName || !postcode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const admin = createAdminWriteClient()

    // ── Create auth user — email auto-confirmed ───────────────────────────────
    const displayName = `${firstName} ${lastName}`.trim()
    const { data: authData, error: createErr } = await admin.auth.admin.createUser({
      email:          email.trim().toLowerCase(),
      password,
      email_confirm:  true,   // skip OTP entirely
      user_metadata: {
        user_type:    "homeowner",
        account_type: "individual",
        is_homeowner: true,
        is_employer:  false,
        is_tradespeople: false,
        first_name:   firstName,
        last_name:    lastName,
        display_name: displayName,
        ...(phone    ? { phone, phone_number: phone } : {}),
        location:     location || postcode,
        ...(latitude  != null ? { latitude }  : {}),
        ...(longitude != null ? { longitude } : {}),
      },
    })

    if (createErr) {
      console.error("[SIGNUP-HOMEOWNER] createUser error:", createErr.message)
      // Surface duplicate-email as a 409 so the client can show "Go to Login"
      if (createErr.message.toLowerCase().includes("already") || createErr.status === 422) {
        return NextResponse.json({ error: "email_exists" }, { status: 409 })
      }
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }

    const userId = authData.user.id

    // ── Ensure public.users row exists (auth trigger normally handles this) ────
    await admin.from("users").upsert({
      id:           userId,
      email:        email.trim().toLowerCase(),
      user_type:    "homeowner",
      account_type: "individual",
      full_name:    displayName,
      ...(phone ? { phone_number: phone } : {}),
    }, { onConflict: "id", ignoreDuplicates: true })

    // ── Ensure homeowner_profiles row exists ──────────────────────────────────
    const { data: existingProfile } = await admin
      .from("homeowner_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (!existingProfile) {
      await admin.from("homeowner_profiles").insert({
        user_id:    userId,
        first_name: firstName,
        last_name:  lastName,
        ...(phone    ? { phone }    : {}),
        location:   location || postcode,
        ...(latitude  != null ? { latitude }  : {}),
        ...(longitude != null ? { longitude } : {}),
      })
    } else {
      // Profile exists — patch location data if missing
      await admin.from("homeowner_profiles").update({
        first_name: firstName,
        last_name:  lastName,
        location:   location || postcode,
        ...(latitude  != null ? { latitude }  : {}),
        ...(longitude != null ? { longitude } : {}),
      }).eq("user_id", userId)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[SIGNUP-HOMEOWNER] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
