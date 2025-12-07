import { middleware as authMiddleware } from "@/lib/middleware"

// Force Node.js runtime to avoid Edge Runtime warnings with Supabase
export const runtime = 'nodejs';

export const middleware = authMiddleware

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/messages/:path*",
    "/applications/:path*",
    "/profile/:path*",
    "/company/profile/:path*",
    "/admin/:path*",
  ],
}
