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
        console.log("[v0] Auth callback - user authenticated, checking user role")

        // Get user role from users table (Facebook-style role-based auth)
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", data.user.id)
          .single()

        if (userError) {
          console.log("[v0] Auth callback - user not found in users table, redirecting to onboarding")
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        // Role-based redirects using database function for consistent routing
        console.log("[v0] Auth callback - user role:", userData.user_type)

        try {
          // Use database function to get correct dashboard route
          const { data: routeData, error: routeError } = await supabase
            .rpc("get_user_dashboard_route", { user_id_param: data.user.id })

          if (!routeError && routeData) {
            console.log("[v0] Auth callback - redirecting to:", routeData)
            return NextResponse.redirect(`${origin}${routeData}`)
          }
        } catch (err) {
          console.log("[v0] Auth callback - route function error, using fallback")
        }

        // Fallback to manual routing if function fails
        switch (userData.user_type) {
          case "admin":
            console.log("[v0] Auth callback - admin user, redirecting to admin dashboard")
            return NextResponse.redirect(`${origin}/admin/dashboard`)

          case "homeowner":
            console.log("[v0] Auth callback - homeowner user, redirecting to homeowner dashboard")
            return NextResponse.redirect(`${origin}/dashboard/homeowner`)

          case "jobseeker":
            console.log("[v0] Auth callback - jobseeker user, redirecting to professional dashboard")
            return NextResponse.redirect(`${origin}/dashboard/professional`)

          case "employer":
            console.log("[v0] Auth callback - employer user, redirecting to company dashboard")
            return NextResponse.redirect(`${origin}/dashboard/company`)

          case "contractor":
            console.log("[v0] Auth callback - contractor user, redirecting to contractor dashboard")
            return NextResponse.redirect(`${origin}/dashboard/contractor`)

          case "company":
            console.log("[v0] Auth callback - company user, redirecting to company dashboard")
            return NextResponse.redirect(`${origin}/dashboard/company`)

          case "professional":
            console.log("[v0] Auth callback - professional user, redirecting to professional dashboard")
            return NextResponse.redirect(`${origin}/dashboard/professional`)

          default:
            console.log("[v0] Auth callback - unknown role, redirecting to onboarding")
            return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
    } catch (error) {
      console.log("[v0] Auth callback - unexpected error:", error)
      return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
    }
  }

  console.log("[v0] Auth callback - no code provided, redirecting to login")
  return NextResponse.redirect(`${origin}/auth/login`)
}
