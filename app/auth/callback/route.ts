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

        if (userError || !userData) {
          console.log("[v0] Auth callback - user not found in users table, redirecting to search page")
          return NextResponse.redirect(`${origin}/`)
        }

        // Role-based redirects using database function for consistent routing
        console.log("[v0] Auth callback - user role:", userData.user_type)

        // Admin users go to admin dashboard, all others go to search page
        if (userData.user_type === "admin") {
          console.log("[v0] Auth callback - admin user, redirecting to admin dashboard")
          return NextResponse.redirect(`${origin}/admin/dashboard`)
        }

        // All other user types go to search page (marketplace first)
        console.log("[v0] Auth callback - redirecting to search page")
        return NextResponse.redirect(`${origin}/`)
      }
    } catch (error) {
      console.log("[v0] Auth callback - unexpected error:", error)
      return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
    }
  }

  console.log("[v0] Auth callback - no code provided, redirecting to login")
  return NextResponse.redirect(`${origin}/auth/login`)
}
