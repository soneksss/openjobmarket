import { createClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"
import { afterSignInPath } from "@/lib/after-sign-in"

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

    const next = await afterSignInPath(supabase, data.user.id, {
      accountType: accountTypeParam,
      returnUrl: searchParams.get("returnUrl"),
    })
    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    console.error("[AUTH-CALLBACK] Unexpected error:", err)
    return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
  }
}
