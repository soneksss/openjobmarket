import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"
import { LayoutContent } from "@/components/layout-content"
import { FeatureFlagsProvider } from "@/contexts/feature-flags-context"
import { AppVersionGate } from "@/components/app-version-gate"
import { createClient } from "@/lib/server"
import { getAdminSettings } from "@/lib/bootstrap"
import { cookies } from "next/headers"
import { type Locale } from "@/lib/i18n/config"
import CapacitorInitWrapper from "@/components/capacitor-init-wrapper"
import { TradesLocationSync } from "@/components/trades-location-sync"
import { IOSInstallBanner } from "@/components/ios-install-banner"

export const metadata: Metadata = {
  metadataBase: new URL("https://www.openjobmarket.com"),
  title: {
    default: "Open Job Market - Find Local Tradespeople Fast",
    template: "%s | Open Job Market",
  },
  description: "Find local tradespeople fast. Connect homeowners with nearby plumbers, electricians, builders and more — powered by location and availability.",
  keywords: [
    "find local tradespeople",
    "hire tradespeople",
    "local plumber",
    "local electrician",
    "local builder",
    "trade jobs UK",
    "homeowner jobs",
    "trades near me",
    "open job market",
  ],
  authors: [{ name: "Open Job Market" }],
  creator: "Open Job Market",
  publisher: "Open Job Market",
  icons: {
    icon: [
      { url: "/favicon.ico",        sizes: "48x48"  },
      { url: "/favicon.svg",        type: "image/svg+xml" },
      { url: "/favicon-96x96.png",  type: "image/png", sizes: "96x96" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://www.openjobmarket.com',
    siteName: 'Open Job Market',
    title: 'Open Job Market - Find Local Tradespeople Fast',
    description: 'Connect homeowners with nearby plumbers, electricians, builders and more. Powered by location and availability.',
    images: [
      {
        url: '/Logo.png',
        width: 1200,
        height: 630,
        alt: 'Open Job Market',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Job Market - Find Local Tradespeople Fast',
    description: 'Connect homeowners with nearby plumbers, electricians, builders and more.',
    images: ['/Logo.png'],
  },
  // No global canonical — each page sets its own via generateMetadata.
  // A root-level canonical would point every page's canonical to the homepage,
  // causing Google to mark all pages as "Alternative with proper canonical tag".
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  // Auth must never throw — ECONNRESET or network hiccup would break the entire layout
  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  } catch {
    // Fail open: render as signed-out; client onAuthStateChange recovers on mount
  }

  let userType = null
  if (user) {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .single()
      userType = userData?.user_type ?? null
    } catch {
      userType = null
    }
  }

  // Fetch admin settings + feature flags (unstable_cache — 0 DB queries on hit)
  const { adminSettings, featureFlags } = await getAdminSettings()

  // Read locale from cookie set by middleware (server-side)
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')
  let serverLocale: Locale = (localeCookie?.value === 'pt-BR' || localeCookie?.value === 'en')
    ? localeCookie.value as Locale
    : 'en'

  return (
    <html lang={serverLocale === 'pt-BR' ? 'pt-BR' : 'en'} className={`${GeistSans.variable} ${GeistMono.variable} antialiased dark`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* PWA "Add to Home Screen" full-screen mode — both standards */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OpenJobMarket" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.png" />
        {/* Preconnect to Supabase (profile images, storage) */}
        <link rel="preconnect" href="https://mklxzrvhanlndkyeteog.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://mklxzrvhanlndkyeteog.supabase.co" />
        {/* Preconnect to Leaflet CDN and OSM tiles so map opens faster */}
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tile.openstreetmap.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
        {/* Leaflet CSS — loaded globally so it is guaranteed to be applied before any map
            component initialises. rel="stylesheet" is NOT a preload and does not trigger the
            "preloaded but not used" warning; that warning only comes from rel="preload". */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin="anonymous"
        />
        {/* Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Open Job Market",
              url: "https://www.openjobmarket.com",
              logo: "https://www.openjobmarket.com/Logo.png",
              sameAs: [
                "https://www.openjobmarket.com"
              ]
            })
          }}
        />
        {/* WebSite schema — enables Google Sitelinks Search Box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Open Job Market",
              url: "https://www.openjobmarket.com",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.openjobmarket.com/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body
        className="font-sans min-h-screen flex flex-col bg-slate-900 pb-safe"
        suppressHydrationWarning
      >
        {/* Thin top progress bar on every navigation — industry standard (GitHub / Vercel style) */}
        <NextTopLoader
          color="#10b981"
          height={2}
          showSpinner={false}
          shadow="0 0 8px #10b981,0 0 4px #10b981"
        />
        <FeatureFlagsProvider flags={featureFlags}>
          <AppVersionGate
            minAppVersion={adminSettings.minAppVersion}
            forceUpdate={adminSettings.forceUpdate}
          >
            <Suspense fallback={
              <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
              </div>
            }>
              <LayoutContent user={user} userType={userType} isAdmin={userType === 'admin'} serverLocale={serverLocale}>
                {children}
              </LayoutContent>
            </Suspense>
          </AppVersionGate>
        </FeatureFlagsProvider>
        {/* OTA updater + notifyAppReady — no-op outside Capacitor native context */}
        <CapacitorInitWrapper />
        {/* Silently sync tradesperson lat/lng on every page load (web) */}
        <TradesLocationSync />
        {/* iOS Safari "Add to Home Screen" install prompt */}
        <IOSInstallBanner />
      </body>
    </html>
  )
}
