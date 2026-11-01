import { middleware as proxyHandler } from "@/lib/proxy"

export default proxyHandler

export const config = {
  matcher: [
    // Non-API pages: auth, i18n, canonical redirect. Public files need none of these.
    '/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|js|json|txt|csv|zip|webmanifest)$).*)',
    // Protected routes always run, even if a path happens to end like a file name
    '/dashboard/:path*',
    '/messages/:path*',
    '/applications/:path*',
    '/profile/:path*',
    '/company/profile/:path*',
    '/admin/:path*',
    // API routes that need rate limiting
    '/api/messages',
    '/api/jobs',
    '/api/jobs/:id/dispatch-urgent',
    '/api/jobs/:id/dispatch-flexible',
    // Non-canonical hosts redirect to www for every path, including API routes and public files
    {
      source: '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      has: [{ type: 'host', value: '(?:openjobmarket\\.com|openjobmarket\\.vercel\\.app)' }],
    },
  ],
}
