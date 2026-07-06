import { createClient, createAdminClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Passed by OAuth signup form when the user pre-selected an account type.
  // Absent when user clicked OAuth without selecting, or from the login page.
  const accountTypeParam = searchParams.get("account_type")
  // Set by forgotPassword action so we know this is a password-reset code,
  // not an OAuth sign-in code.
  const typeParam = searchParams.get("type")

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

    // Password-reset flow: code has been exchanged, session is now in the cookie.
    // Send straight to the reset-password page; the form will call updateUser()
    // against the active session — no code param needed.
    if (typeParam === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password?session_active=1`)
    }

    const userId = data.user.id

    // ── Claim flow: process the seeded-business claim before any redirect ──────
    // claimToken is passed in the emailRedirectTo URL by the company signup form
    // so that users who click the confirmation link (instead of entering the OTP)
    // still get their seeded business linked to their new account.
    const claimToken = searchParams.get("claimToken")
    if (claimToken) {
      const { error: claimErr } = await supabase.rpc("claim_seeded_business", { p_token: claimToken })
      if (claimErr) {
        console.error("[AUTH-CALLBACK] Claim failed:", claimErr.message)
        // Redirect back to the verify-email page so the user can try again via OTP
        const claimErrorUrl = `${origin}/auth/verify-email?email=${encodeURIComponent(data.user.email ?? "")}&claimError=1&claimToken=${encodeURIComponent(claimToken)}`
        return NextResponse.redirect(claimErrorUrl)
      }
    }

    // ── Step 1: Get current user_type from DB ─────────────────────────────────
    const { data: userData } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", userId)
      .maybeSingle()

    if (!userData) {
      // Row not found at all — trigger hasn't fired yet; send to onboarding
      console.log("[AUTH-CALLBACK] No users row, sending to onboarding")
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    // ── Step 2: Fix user_type for new OAuth signups ───────────────────────────
    // The handle_new_user trigger defaults user_type to 'professional' when no
    // app metadata is present (Google/Facebook don't send it).
    // If the signup form passed account_type in the callback URL, apply it now.
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
        console.log("[AUTH-CALLBACK] Corrected user_type →", intendedType)
        resolvedUserType = intendedType
      }
    }

    // ── Step 3: Unknown role → choose-role page ───────────────────────────────
    // Covers: new Google/Facebook users who didn't pre-select an account type,
    // legacy 'professional' rows, and any other unrecognised type.
    if (resolvedUserType !== "homeowner" && resolvedUserType !== "company" && resolvedUserType !== "admin") {
      console.log("[AUTH-CALLBACK] Unknown/unset role, redirecting to choose-role")
      return NextResponse.redirect(`${origin}/auth/choose-role`)
    }

    // ── Step 4: Create profile if missing ────────────────────────────────────
    // This is intentionally non-fatal. If it fails the user still enters the app;
    // a missing profile just means some dashboard sections will be empty.
    const { error: profileError } = await supabase
      .rpc("complete_user_profile_after_verification", { p_user_id: userId })
    if (profileError) {
      console.error("[AUTH-CALLBACK] Profile RPC error (non-fatal):", profileError.message)
    }

    // ── Step 5: Role-based redirect ───────────────────────────────────────────
    // No first_name / company_name gates — users enter the app immediately.
    // Incomplete profiles are handled with dashboard banners, not redirect loops.
    if (resolvedUserType === "admin") {
      return NextResponse.redirect(`${origin}/admin/dashboard`)
    }
    if (resolvedUserType === "company") {
      return NextResponse.redirect(`${origin}/dashboard/company`)
    }
    // homeowner
    return NextResponse.redirect(`${origin}/dashboard/homeowner`)

  } catch (err) {
    console.error("[AUTH-CALLBACK] Unexpected error:", err)
    return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
  }
}
