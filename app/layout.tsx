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
  title: "Open Job Market - The World's First Map-Based Job & Talent Marketplace",
  description:
    "Discover jobs and talent on an interactive map. AI-powered matching, global reach, and privacy-first approach to hiring.",
  generator: "v0.app",
}

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  console.log("[v0] Layout rendering...")

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log("[LAYOUT] User data:", { hasUser: !!user, userEmail: user?.email, userId: user?.id, userError })

  let userType = null
  if (user) {
    try {
      const { data: userData, error } = await supabase.from("users").select("user_type").eq("id", user.id).single()
      if (error) {
        // Log error but don't break - user might be in the process of onboarding
        if (typeof console !== 'undefined' && console.log) {
          console.log("[LAYOUT] Could not fetch user type (user may be onboarding):", error.code)
        }
        userType = null
      } else {
        userType = userData?.user_type
        if (typeof console !== 'undefined' && console.log) {
          console.log("[LAYOUT] User type found:", userType)
        }
      }
    } catch (error) {
      // Silently handle - user might be mid-onboarding
      userType = null
    }
  }

  console.log("[LAYOUT] Final user data for layout:", { hasUser: !!user, userType })

  // Read locale from cookie set by middleware (server-side)
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')
  let serverLocale: Locale = (localeCookie?.value === 'pt-BR' || localeCookie?.value === 'en')
    ? localeCookie.value as Locale
    : 'en'

  console.log("[LAYOUT] Server-side locale detected:", serverLocale, "from cookie:", localeCookie?.value)

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
