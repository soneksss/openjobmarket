import { createAdminWriteClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/auth/create-guest-account
 *
 * Called by the job wizard Step 4 when a guest (unauthenticated) completes
 * contact details. Creates:
 *   1. Auth user (email pre-confirmed, no OTP)
 *   2. homeowner_profiles row
 *   3. The job itself
 *
 * Returns { jobId, urgencyType } so the client can redirect to live tracking.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName, lastName, email, password, phone,
      postcode, location, latitude, longitude,
      jobData,
    } = body as {
      firstName: string
      lastName:  string
      email:     string
      password:  string
      phone?:    string
      postcode:  string
      location?: string
      latitude?: number | null
      longitude?: number | null
      jobData:   Record<string, any>
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!email || !password || !firstName || !lastName || !postcode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 })
    }
    if (!jobData) {
      return NextResponse.json({ error: "Missing job data" }, { status: 400 })
    }

    const admin = createAdminWriteClient()
    const displayName = `${firstName} ${lastName}`.trim()

    // ── 1. Create auth user (email pre-confirmed) ─────────────────────────────
    const { data: authData, error: createErr } = await admin.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        user_type:       "homeowner",
        account_type:    "individual",
        is_homeowner:    true,
        is_employer:     false,
        is_tradespeople: false,
        first_name:      firstName,
        last_name:       lastName,
        display_name:    displayName,
        ...(phone ? { phone, phone_number: phone } : {}),
        location: location || postcode,
        ...(latitude  != null ? { latitude }  : {}),
        ...(longitude != null ? { longitude } : {}),
      },
    })

    if (createErr) {
      console.error("[CREATE-GUEST] createUser error:", createErr.message)
      if (createErr.message.toLowerCase().includes("already") || createErr.status === 422) {
        return NextResponse.json({ error: "email_exists" }, { status: 409 })
      }
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }

    const userId = authData.user.id

    // ── 2. Ensure public.users row ────────────────────────────────────────────
    await admin.from("users").upsert({
      id:           userId,
      email:        email.trim().toLowerCase(),
      user_type:    "homeowner",
      account_type: "individual",
      full_name:    displayName,
      ...(phone ? { phone_number: phone } : {}),
    }, { onConflict: "id", ignoreDuplicates: true })

    // ── 3. Ensure homeowner_profiles row ──────────────────────────────────────
    let homeownerProfileId: string | null = null

    const { data: existingProfile } = await admin
      .from("homeowner_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (existingProfile) {
      homeownerProfileId = existingProfile.id
      await admin.from("homeowner_profiles").update({
        first_name: firstName,
        last_name:  lastName,
        location:   location || postcode,
        ...(phone     ? { phone }     : {}),
        ...(latitude  != null ? { latitude }  : {}),
        ...(longitude != null ? { longitude } : {}),
      }).eq("user_id", userId)
    } else {
      const { data: newProfile, error: profileErr } = await admin
        .from("homeowner_profiles")
        .insert({
          user_id:    userId,
          first_name: firstName,
          last_name:  lastName,
          location:   location || postcode,
          ...(phone     ? { phone }     : {}),
          ...(latitude  != null ? { latitude }  : {}),
          ...(longitude != null ? { longitude } : {}),
        })
        .select("id")
        .single()

      if (profileErr) {
        console.error("[CREATE-GUEST] homeowner_profiles insert error:", profileErr.message)
        // Non-fatal: proceed with job creation; user can update profile later
      } else {
        homeownerProfileId = newProfile?.id ?? null
      }
    }

    // ── 4. Insert the job ─────────────────────────────────────────────────────
    const jobPayload = {
      ...jobData,
      homeowner_id: homeownerProfileId,
      // Ensure these are not overridden by stale guest values
      status:    "POSTED",
      is_active: true,
      created_at: new Date().toISOString(),
    }

    const { error: jobErr } = await admin.from("jobs").insert(jobPayload)
    if (jobErr) {
      console.error("[CREATE-GUEST] job insert error:", jobErr.message)
      return NextResponse.json({ error: "Failed to create job: " + jobErr.message }, { status: 500 })
    }

    const jobId       = (jobPayload as any).id
    const urgencyType = (jobPayload as any).urgency_type

    // ── 5. Fire dispatch (fire-and-forget) ────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openjobmarket.com"
    if (urgencyType === "asap") {
      fetch(`${baseUrl}/api/jobs/${jobId}/dispatch-urgent`, { method: "POST" }).catch(() => {})
    } else if (urgencyType === "flexible") {
      fetch(`${baseUrl}/api/jobs/${jobId}/dispatch-flexible`, { method: "POST" }).catch(() => {})
    }

    return NextResponse.json({ success: true, jobId, urgencyType })
  } catch (err: any) {
    console.error("[CREATE-GUEST] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
