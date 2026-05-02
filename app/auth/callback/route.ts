import { createClient, createAdminClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Passed by multi-step-signup OAuth to signal intended user type
  // ('individual' → homeowner, 'company' → company tradesperson)
  const accountTypeParam = searchParams.get("account_type")

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user) {
      console.error("[AUTH-CALLBACK] Session exchange failed:", error?.message)
      return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
    }

    const userId = data.user.id

    // ── Step 1: Get current user_type from DB ─────────────────────────────
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", userId)
      .maybeSingle()

    if (userError || !userData?.user_type) {
      // Row not found at all — very early failure, try onboarding
      console.log("[AUTH-CALLBACK] No users row yet, sending to onboarding")
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    // ── Step 2: Fix user_type for new Google OAuth signups ───────────────
    // The handle_new_user trigger defaults user_type to 'professional' when no
    // metadata is provided (Google doesn't send app metadata). If the signup
    // form passed account_type in the callback URL, honour it.
    let resolvedUserType = userData.user_type
    if (accountTypeParam && userData.user_type === "professional") {
      const intendedType = accountTypeParam === "company" ? "company" : "homeowner"
      const admin = createAdminClient()
      const { error: updateErr } = await admin
        .from("users")
        .update({ user_type: intendedType })
        .eq("id", userId)
      if (updateErr) {
        console.error("[AUTH-CALLBACK] Failed to fix user_type:", updateErr.message)
      } else {
        console.log("[AUTH-CALLBACK] Corrected user_type from 'professional' to:", intendedType)
        resolvedUserType = intendedType
      }
    }

    // ── Step 3: Create profile (now that user_type is correct) ───────────
    const { error: profileError } = await supabase
      .rpc("complete_user_profile_after_verification", { p_user_id: userId })
    if (profileError) {
      console.error("[AUTH-CALLBACK] Profile creation RPC error:", profileError.message)
      // Non-fatal — profile can be completed from dashboard
    }

    // ── Step 4: Role-based redirect ──────────────────────────────────────
    if (resolvedUserType === "admin") {
      return NextResponse.redirect(`${origin}/admin/dashboard`)
    }

    if (resolvedUserType === "company") {
      const { data: cp } = await supabase
        .from("company_profiles")
        .select("company_name")
        .eq("user_id", userId)
        .maybeSingle()
      if (!cp?.company_name) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      return NextResponse.redirect(`${origin}/dashboard/company`)
    }

    if (resolvedUserType === "homeowner") {
      // Only gate on first_name — missing location is shown as a banner inside
      // the dashboard, not a redirect. Google OAuth never provides location.
      const { data: hp } = await supabase
        .from("homeowner_profiles")
        .select("first_name")
        .eq("user_id", userId)
        .maybeSingle()
      if (!hp?.first_name) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      return NextResponse.redirect(`${origin}/dashboard/homeowner`)
    }

    // Unknown role — generic dashboard will resolve
    return NextResponse.redirect(`${origin}/dashboard`)

  } catch (err) {
    console.error("[AUTH-CALLBACK] Unexpected error:", err)
    return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
  }
}
