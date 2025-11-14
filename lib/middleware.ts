import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Get user - this will also refresh the session if needed
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('[MIDDLEWARE] Auth error:', authError.message)
  }

  console.log('[MIDDLEWARE] Processing:', request.nextUrl.pathname, 'User:', user?.email || 'none', 'Auth error:', authError?.message || 'none')

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth/") || request.nextUrl.pathname.startsWith("/admin/login")
  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/jobs") ||
    request.nextUrl.pathname.startsWith("/tasks") ||
    request.nextUrl.pathname.startsWith("/companies") ||
    request.nextUrl.pathname.startsWith("/professionals") ||
    request.nextUrl.pathname.startsWith("/search") ||
    request.nextUrl.pathname.startsWith("/map")

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/messages") ||
    request.nextUrl.pathname.startsWith("/applications") ||
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/company/profile") ||
    isAdminRoute

  if (isProtectedRoute && !user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Allow logged-in users to access the homepage (unified search page)
  // The homepage now serves as a unified search page for both guests and signed-in users
  if (user && request.nextUrl.pathname === "/") {
    console.log('[MIDDLEWARE] Logged-in user on homepage, allowing access to unified search page')
    // Do not redirect - let them access the unified homepage
  }

  if (isAuthRoute && user) {
    // Role-based redirect (Facebook-style)
    console.log('[MIDDLEWARE] Checking user role for:', user.email)

    try {
      // Get user role from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .single()

      const url = request.nextUrl.clone()

      if (userError || !userData) {
        console.log('[MIDDLEWARE] User not found in users table, redirecting to /dashboard')
        url.pathname = "/dashboard"
      } else {
        // Role-based redirects
        switch (userData.user_type) {
          case "admin":
            console.log('[MIDDLEWARE] Admin user, redirecting to /admin/dashboard')
            url.pathname = "/admin/dashboard"
            break
          case "company":
            console.log('[MIDDLEWARE] Company user, redirecting to /dashboard/company')
            url.pathname = "/dashboard/company"
            break
          case "professional":
            console.log('[MIDDLEWARE] Professional user, redirecting to /dashboard/professional')
            url.pathname = "/dashboard/professional"
            break
          default:
            console.log('[MIDDLEWARE] Unknown role, redirecting to /dashboard')
            url.pathname = "/dashboard"
        }
      }
      return NextResponse.redirect(url)
    } catch (error) {
      console.log('[MIDDLEWARE] Error checking user role:', error)
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // Redirect admin users accessing regular dashboard routes
  if (user && request.nextUrl.pathname.startsWith("/dashboard") && !isAdminRoute) {
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .single()

      if (!userError && userData?.user_type === "admin") {
        console.log('[MIDDLEWARE] Admin user accessing regular dashboard, redirecting to admin dashboard')
        const url = request.nextUrl.clone()
        url.pathname = "/admin/dashboard"
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.log('[MIDDLEWARE] Error checking admin redirect:', error)
    }
  }

  return supabaseResponse
}
