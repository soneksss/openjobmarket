import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { LayoutContent } from "@/components/layout-content"
import { createClient } from "@/lib/server"
import { cookies } from "next/headers"
import { type Locale } from "@/lib/i18n/config"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com'),
  title: {
    default: "OpenJobMarket - Find Jobs, Hire Talent & Connect with Tradespeople",
    template: "%s | OpenJobMarket",
  },
  description:
    "Find jobs, hire professionals, and connect with skilled tradespeople on OpenJobMarket. Post job listings, build your CV, and discover opportunities across the UK and Brazil.",
  keywords: [
    "job market",
    "find jobs",
    "hire talent",
    "tradespeople",
    "contractors",
    "job listings",
    "CV builder",
    "professional profiles",
    "UK jobs",
    "Brazil jobs",
  ],
  authors: [{ name: "OpenJobMarket" }],
  creator: "OpenJobMarket",
  publisher: "OpenJobMarket",
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
    alternateLocale: ['pt_BR'],
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com',
    siteName: 'OpenJobMarket',
    title: 'OpenJobMarket - Find Jobs, Hire Talent & Connect with Tradespeople',
    description:
      'Find jobs, hire professionals, and connect with skilled tradespeople on OpenJobMarket. Post job listings, build your CV, and discover opportunities across the UK and Brazil.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpenJobMarket',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenJobMarket - Find Jobs, Hire Talent & Connect with Tradespeople',
    description:
      'Find jobs, hire professionals, and connect with skilled tradespeople on OpenJobMarket.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com',
    languages: {
      'en': process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com',
      'pt-BR': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com'}/br`,
      'x-default': process.env.NEXT_PUBLIC_SITE_URL || 'https://openjobmarket.com',
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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  let userType = null
  if (user) {
    try {
      const { data: userData, error } = await supabase.from("users").select("user_type").eq("id", user.id).single()
      if (error) {
        // Log error but don't break - user might be in the process of onboarding
        userType = null
      } else {
        userType = userData?.user_type
      }
    } catch (error) {
      // Silently handle - user might be mid-onboarding
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
      </head>
      <body
        className="font-sans min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        <Suspense fallback={<div className="flex-1" />}>
          <LayoutContent user={user} userType={userType} serverLocale={serverLocale}>
            {children}
          </LayoutContent>
        </Suspense>
      </body>
    </html>
  )
}
