import { middleware as proxyHandler } from "@/lib/proxy"

export default proxyHandler

export const config = {
  matcher: [
    // Non-API pages: auth, i18n, canonical redirect
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    // API routes that need rate limiting
    '/api/messages',
    '/api/jobs',
    '/api/jobs/:id/dispatch-urgent',
    '/api/jobs/:id/dispatch-flexible',
  ],
}
