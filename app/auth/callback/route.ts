import { createClient } from "@/lib/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("[v0] Auth callback route handler started")
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  console.log("[v0] Auth callback - code:", !!code, "next:", next)

  if (code) {
    try {
      const supabase = await createClient()
      console.log("[v0] Auth callback - exchanging code for session")

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.log("[v0] Auth callback - exchange error:", error.message)
        return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
      }

      if (data.user) {
        console.log("[v0] Auth callback - user authenticated, completing profile creation")

        // After email verification, create user profile if it doesn't exist
        const { data: profileResult, error: profileError } = await supabase
          .rpc("complete_user_profile_after_verification", { p_user_id: data.user.id })

        if (profileError) {
          console.log("[v0] Auth callback - error creating profile:", profileError)
          // Continue anyway - user can edit profile later in settings
        } else {
          console.log("[v0] Auth callback - profile creation result:", profileResult)
        }

        // Get user role from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", data.user.id)
          .maybeSingle()

        if (userError || !userData || !userData.user_type) {
          // New OAuth user — no users table row or role not set yet. Send to onboarding.
          console.log("[v0] Auth callback - new OAuth user or missing role, redirecting to onboarding")
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        // Role-based redirects with profile-completeness guard
        console.log("[v0] Auth callback - user role:", userData.user_type)

        if (userData.user_type === "admin") {
          return NextResponse.redirect(`${origin}/admin/dashboard`)
        }

        // For Google OAuth users: verify their profile has the minimum required
        // fields. If not, send them to /onboarding to complete setup.
        if (userData.user_type === "company") {
          const { data: cp } = await supabase
            .from("company_profiles")
            .select("company_name, location")
            .eq("user_id", data.user.id)
            .maybeSingle()

          if (!cp || !cp.company_name || !cp.location) {
            console.log("[v0] Auth callback - company profile incomplete, redirecting to onboarding")
            return NextResponse.redirect(`${origin}/onboarding`)
          }
          return NextResponse.redirect(`${origin}/dashboard/company`)
        }

        if (userData.user_type === "homeowner") {
          const { data: hp } = await supabase
            .from("homeowner_profiles")
            .select("first_name, location")
            .eq("user_id", data.user.id)
            .maybeSingle()

          if (!hp || !hp.first_name || !hp.location) {
            console.log("[v0] Auth callback - homeowner profile incomplete, redirecting to onboarding")
            return NextResponse.redirect(`${origin}/onboarding`)
          }
          return NextResponse.redirect(`${origin}/dashboard/homeowner`)
        }

        // Unknown role — send to generic dashboard which will re-resolve
        return NextResponse.redirect(`${origin}/dashboard`)
      }
    } catch (error) {
      console.log("[v0] Auth callback - unexpected error:", error)
      return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
    }
  }

  console.log("[v0] Auth callback - no code provided, redirecting to login")
  return NextResponse.redirect(`${origin}/auth/login`)
}
