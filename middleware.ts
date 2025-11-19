import { middleware as authMiddleware } from "@/lib/middleware"

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
