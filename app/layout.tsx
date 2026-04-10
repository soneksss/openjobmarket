import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"
import { LayoutContent } from "@/components/layout-content"
import { createClient } from "@/lib/server"
import { cookies } from "next/headers"
import { type Locale } from "@/lib/i18n/config"

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
      { url: "/Logo.png", type: "image/png" },
    ],
    apple: "/Logo.png",
    shortcut: "/Logo.png",
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
  alternates: {
    canonical: 'https://www.openjobmarket.com',
    languages: {
      'en': 'https://www.openjobmarket.com',
      'pt-BR': 'https://www.openjobmarket.com/br',
      'x-default': 'https://www.openjobmarket.com',
    },
  },
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
  let user = null
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

  // Read locale from cookie set by middleware (server-side)
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')
  let serverLocale: Locale = (localeCookie?.value === 'pt-BR' || localeCookie?.value === 'en')
    ? localeCookie.value as Locale
    : 'en'

  return (
    <html lang={serverLocale === 'pt-BR' ? 'pt-BR' : 'en'} className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Preconnect to Supabase (profile images, storage) */}
        <link rel="preconnect" href="https://mklxzrvhanlndkyeteog.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://mklxzrvhanlndkyeteog.supabase.co" />
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
        className="font-sans min-h-screen flex flex-col bg-slate-900"
        suppressHydrationWarning
      >
        {/* Thin top progress bar on every navigation — industry standard (GitHub / Vercel style) */}
        <NextTopLoader
          color="#10b981"
          height={2}
          showSpinner={false}
          shadow="0 0 8px #10b981,0 0 4px #10b981"
        />
        <Suspense fallback={
          <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
          </div>
        }>
          <LayoutContent user={user} userType={userType} isAdmin={userType === 'admin'} serverLocale={serverLocale}>
            {children}
          </LayoutContent>
        </Suspense>
      </body>
    </html>
  )
}
