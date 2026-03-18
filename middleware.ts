import { middleware as authMiddleware } from "@/lib/middleware"

// Force Node.js runtime to avoid Edge Runtime warnings with Supabase
export const runtime = 'nodejs';

export const middleware = authMiddleware

export const config = {
  matcher: [
    // Match all paths except static files, API routes, and SEO files
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
}
