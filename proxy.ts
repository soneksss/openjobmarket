import { middleware as proxyHandler } from "@/lib/proxy"

export default proxyHandler

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
