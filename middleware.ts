import { middleware as authMiddleware } from "@/lib/middleware"

// Force Node.js runtime to avoid Edge Runtime warnings with Supabase
export const runtime = 'nodejs';

export const middleware = authMiddleware

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
}
