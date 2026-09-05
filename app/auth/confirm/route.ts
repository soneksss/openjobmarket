import { createClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

/**
 * GET /auth/confirm
 *
 * Verifies an email OTP `token_hash` entirely server-side, then routes the user
 * to the right place. Used by the email templates (password recovery, magic
 * link, email change, signup confirm).
 *
 * Why this exists: the default `{{ .ConfirmationURL }}` link goes through
 * Supabase's `/auth/v1/verify` endpoint, which then redirects to `redirect_to`
 * with the session in a URL *hash fragment*. Fragments never reach the server,
 * and anything triggered from the Supabase Dashboard uses the bare Site URL as
 * `redirect_to` — so the recovery session gets lost on the homepage redirect.
 *
 * A `token_hash` link lands here directly with a plain query string we can
 * verify with `verifyOtp`, no fragment, no dependency on what `redirect_to`
 * happened to be. Works identically whether the email was sent from the app's
 * "Forgot password" form or the Supabase Dashboard's "Send recovery" button.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next")

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    console.error("[AUTH-CONFIRM] verifyOtp failed:", error.message)
    // login-form.tsx reads this fragment and shows "This link has expired…"
    const params = new URLSearchParams({
      error: "access_denied",
      error_code: error.code ?? "otp_expired",
      error_description: error.message,
    })
    return NextResponse.redirect(`${origin}/auth/login#${params.toString()}`)
  }

  // Session is now in the cookie. Route by flow.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/reset-password?session_active=1`)
  }
  if (next && next.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
