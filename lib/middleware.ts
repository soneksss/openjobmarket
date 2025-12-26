import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getLocaleFromPathname } from "./i18n/config";

// Force Node.js runtime to avoid Edge Runtime warnings with Supabase
export const runtime = 'nodejs';

// Locales configuration
const locales = ['en', 'pt-BR'] as const
type Locale = typeof locales[number]

// Paths that should not trigger any middleware logic
const ignoredPaths = [
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/sitemap',
  '/logo',
  '/Logo',
  '/public',
]

function shouldIgnorePath(pathname: string): boolean {
  return ignoredPaths.some(path => pathname.startsWith(path))
}

function detectBrowserLocale(req: NextRequest): Locale {
  // Check cookie first
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale === 'pt-BR' || cookieLocale === 'en') {
    return cookieLocale
  }

  // Detect from Accept-Language header
  const acceptLanguage = req.headers.get('accept-language')
  if (acceptLanguage) {
    // Parse Accept-Language header
    const languages = acceptLanguage.split(',').map(lang => {
      const [locale, q = 'q=1'] = lang.trim().split(';')
      const quality = parseFloat(q.replace('q=', ''))
      return { locale: locale.trim(), quality }
    })

    // Sort by quality
    languages.sort((a, b) => b.quality - a.quality)

    // Check if any preferred language is Portuguese (Brazil)
    for (const { locale } of languages) {
      const lang = locale.toLowerCase()
      // Match pt-BR, pt-br, pt_BR, pt, etc.
      if (lang.startsWith('pt-br') || lang.startsWith('pt_br') || lang === 'pt') {
        return 'pt-BR'
      }
    }
  }

  // Default to English
  return 'en'
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip ignored paths completely
  if (shouldIgnorePath(pathname)) {
    return NextResponse.next();
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // === I18N LOCALE DETECTION & AUTO-REDIRECT ===
  // Handle locale detection, auto-redirect for Brazilian users, and cookie setting
  const currentLocale = getLocaleFromPathname(pathname)
  const isOnBrRoute = pathname.startsWith('/br')

  // Check for manual user preference (set when user explicitly chooses language)
  const userPreference = req.cookies.get('USER_LOCALE_PREFERENCE')?.value

  // Auto-redirect Brazilian users to /br (if no manual preference set)
  if (!isOnBrRoute && !userPreference) {
    const preferredLocale = detectBrowserLocale(req)

    // Redirect to /br + current path if browser prefers Portuguese
    if (preferredLocale === 'pt-BR') {
      const url = req.nextUrl.clone()
      // Preserve the current path by adding /br prefix
      url.pathname = `/br${pathname}`
      const response = NextResponse.redirect(url)
      response.cookies.set('NEXT_LOCALE', 'pt-BR', {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      })
      return response
    }
  }

  // Track manual language selection: if user visits root (/) when they were previously on /br,
  // or explicitly navigates to a non-/br path, set preference to English
  if (!isOnBrRoute && pathname === '/' && req.cookies.get('NEXT_LOCALE')?.value === 'pt-BR') {
    res.cookies.set('USER_LOCALE_PREFERENCE', 'en', {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })
  }

  // Set locale cookie based on current path
  if (currentLocale) {
    res.cookies.set('NEXT_LOCALE', currentLocale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    // Update user preference when on /br (they chose Portuguese)
    if (isOnBrRoute && currentLocale === 'pt-BR') {
      res.cookies.set('USER_LOCALE_PREFERENCE', 'pt-BR', {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      })
    }
  }

  // === AUTH PROTECTION ===
  const protectedRoutes = [
    "/dashboard",
    "/messages",
    "/applications",
    "/profile",
    "/company/profile",
    "/admin"
  ];

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) return res;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            res = NextResponse.next({
              request: req,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    return res;
  } catch (err) {
    console.error("MIDDLEWARE ERROR:", err);
    return res; // fail open
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - api routes (handled separately)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
