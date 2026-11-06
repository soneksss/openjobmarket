import { createClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"
import { afterSignInPath } from "@/lib/after-sign-in"

// Landing step after a sign-in that already created the session in the
// browser (native Sign in with Apple in the iPhone app). Runs the same
// post-sign-in steps as /auth/callback, without a code to exchange.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)

    const next = await afterSignInPath(supabase, user.id, {
      accountType: searchParams.get("account_type"),
      returnUrl: searchParams.get("returnUrl"),
    })
    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    console.error("[AUTH-FINISH] Unexpected error:", err)
    return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
  }
}
