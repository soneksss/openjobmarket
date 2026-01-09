"use client"

import type React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/toaster"
import { useAutoLogout } from "@/hooks/use-auto-logout"
import { I18nProvider } from "@/lib/i18n/context"
import { getLocaleFromPathname, type Locale } from "@/lib/i18n/config"
import { LanguageRegionProvider } from "@/contexts/language-region-context"
import { LanguageRegionModal } from "@/components/language-region-modal"
import { parseLanguageRegionCookie, LANGUAGE_REGION_COOKIE, DEFAULT_STATE } from "@/lib/i18n/language-region"

export function LayoutContent({
  children,
  user,
  userType,
  serverLocale,
}: {
  children: React.ReactNode
  user: any
  userType: string | null
  serverLocale?: Locale
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdminRoute = pathname?.startsWith("/admin")

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

  if (isAdminRoute) {
    return (
      <I18nProvider initialLocale={locale}>
        <LanguageRegionProvider initialState={getInitialLanguageRegionState()}>
          <main className="flex-1">{children}</main>
          <Toaster />
          <LanguageRegionModal />
        </LanguageRegionProvider>
      </I18nProvider>
    )
  }

  return (
    <I18nProvider initialLocale={locale}>
      <LanguageRegionProvider initialState={getInitialLanguageRegionState()}>
        <Header user={user} userType={(userType as "company" | "professional" | undefined) || undefined} />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
        <LanguageRegionModal />
      </LanguageRegionProvider>
    </I18nProvider>
  )
}
