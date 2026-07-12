"use client"

import type React from "react"
import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/toaster"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useAutoLogout } from "@/hooks/use-auto-logout"
import { createClient } from "@/lib/client"
import { I18nProvider } from "@/lib/i18n/context"
import { getLocaleFromPathname, type Locale } from "@/lib/i18n/config"
import { LanguageRegionProvider } from "@/contexts/language-region-context"
import { LanguageRegionModal } from "@/components/language-region-modal"
import { parseLanguageRegionCookie, LANGUAGE_REGION_COOKIE, DEFAULT_STATE } from "@/lib/i18n/language-region"
import { ActiveSearchProvider } from "@/lib/contexts/active-search-context"
import { AvailableNowProvider } from "@/contexts/available-now-context"
import { ActiveSearchBar } from "@/components/active-search-bar"
import { UrgentJobNotifier, HomeownerJobNotifier } from "@/components/urgent-job-notifier"
import { PushSubscriptionManager } from "@/components/push-subscription-manager"
import { NativePushManager } from "@/components/native-push-manager"
import { PresenceTracker } from "@/components/presence-tracker"
import { PageTransition } from "@/components/page-transition"
import { NavigationLoader } from "@/components/navigation-loader"
import { PageviewTracker } from "@/components/pageview-tracker"

interface LayoutContentProps {
  children: React.ReactNode
  user: any
  userType: string | null
  isAdmin?: boolean
  serverLocale?: Locale
}

/* Inner component — can safely use useActiveSearch (provided above it) */
function LayoutInner({ children, user, userType, isAdmin, serverLocale }: LayoutContentProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdminRoute = pathname?.startsWith("/admin")
  const isHomePage = pathname === "/" || pathname === "/br" || pathname === "/home"
  const isDashboardPage = pathname?.startsWith("/dashboard")
  const isJobPostingPage = pathname?.includes("/jobs/new") || pathname?.includes("/post-job")

  // Check query parameter first (highest priority), then server locale, then pathname
  const localeParam = searchParams?.get('locale')
  const locale: Locale = (localeParam === 'pt-BR' || localeParam === 'en')
    ? localeParam as Locale
    : (serverLocale || getLocaleFromPathname(pathname || '/'))

  // Get initial language/region state from query param, server locale, or cookie (client-side)
  const getInitialLanguageRegionState = () => {
    // Check query parameter first (highest priority)
    if (localeParam === 'pt-BR') {
      return { language: 'pt-BR' as const, country: 'BR' as const }
    }

    // Use server-provided locale second
    if (serverLocale === 'pt-BR') {
      return { language: 'pt-BR' as const, country: 'BR' as const }
    }

    if (typeof document === 'undefined') return DEFAULT_STATE

    const cookies = document.cookie.split(';')

    // Check NEXT_LOCALE cookie (set by middleware)
    const nextLocaleCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='))
    const nextLocale = nextLocaleCookie?.split('=')[1]?.trim()

    if (nextLocale === 'pt-BR') {
      return { language: 'pt-BR' as const, country: 'BR' as const }
    }

    // Fall back to LANGUAGE_REGION_COOKIE
    const languageRegionCookie = cookies.find(c => c.trim().startsWith(`${LANGUAGE_REGION_COOKIE}=`))
    if (languageRegionCookie) {
      const value = languageRegionCookie.split('=')[1]
      return parseLanguageRegionCookie(value)
    }

    return DEFAULT_STATE
  }

  // Enable auto-logout for authenticated users
  useAutoLogout()

  // Background session drift protection — runs once on mount, never blocks rendering.
  // Validates the local INITIAL_SESSION against the Supabase server.
  // Only signs out on a clean "no user" response — network errors are ignored so a
  // flaky connection can never log someone out.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && !data.user) {
        supabase.auth.signOut()
      }
    })
  }, [])

  if (isAdminRoute) {
    return (
      <I18nProvider initialLocale={locale}>
        <LanguageRegionProvider initialState={getInitialLanguageRegionState()}>
          <NavigationLoader />
          <main className="flex-1"><PageTransition>{children}</PageTransition></main>
          <Toaster />
          <LanguageRegionModal />
        </LanguageRegionProvider>
      </I18nProvider>
    )
  }

  return (
    <I18nProvider initialLocale={locale}>
      <LanguageRegionProvider initialState={getInitialLanguageRegionState()}>
        <NavigationLoader />
        <PageviewTracker />
        {/* Job posting: hide on mobile (keyboard pushes it over the form).
            Map pages: sticky z-[100] on all sizes — the map sits below it via --global-header-h. */}
        <div className={
          isJobPostingPage ? "hidden md:block md:sticky md:top-0 md:z-[100]" :
          pathname?.startsWith("/find") ? "sticky top-0 z-[100]" :
          undefined
        }>
          <Header user={user} userType={(userType as "company" | "professional" | undefined) || undefined} isAdmin={isAdmin} dark={true} />
        </div>
        {/* Sticky bar shown when user has minimised an active trade search */}
        <ActiveSearchBar userType={userType} userId={user?.id} />
        {/* Live urgent job alert for company (tradesperson) users */}
        {userType === "company" && user?.id && (
          <>
            <UrgentJobNotifier userId={user.id} />
            {/* Web Push — works in browsers and PWAs */}
            <PushSubscriptionManager />
          </>
        )}
        {/* Native push (FCM/APNs) — no-op in browsers, registers in Capacitor apps */}
        {user?.id && <NativePushManager />}
        {/* Presence heartbeat — updates last_seen_at every 60s while app is open */}
        {user?.id && <PresenceTracker userId={user.id} />}
        {/* Live application alert for homeowner users */}
        {userType === "homeowner" && user?.id && (
          <HomeownerJobNotifier userId={user.id} />
        )}
        <main className={`flex-1 ${!isJobPostingPage ? 'pb-24 md:pb-0' : ''}`}><PageTransition>{children}</PageTransition></main>
        {/* Hide footer completely on homepage and dashboard pages */}
        {!isHomePage && !isDashboardPage && (
          <Footer />
        )}
        {/* Hide nav on job posting pages — keyboard pushes it over the form */}
        {!isJobPostingPage && <MobileBottomNav user={user} userType={userType} />}
        <Toaster />
        <LanguageRegionModal />
      </LanguageRegionProvider>
    </I18nProvider>
  )
}

/* Exported wrapper — provides ActiveSearchContext + AvailableNowContext to the whole layout */
export function LayoutContent(props: LayoutContentProps) {
  return (
    <ActiveSearchProvider>
      <AvailableNowProvider>
        <LayoutInner {...props} />
      </AvailableNowProvider>
    </ActiveSearchProvider>
  )
}

