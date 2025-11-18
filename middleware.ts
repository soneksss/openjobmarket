import { updateSession } from "@/lib/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

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
