"use client"

import type React from "react"
import { usePathname } from "next/navigation"
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
}: {
  children: React.ReactNode
  user: any
  userType: string | null
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith("/admin")

  // Detect locale from cookie (priority) or pathname
  const getInitialLocale = (): Locale => {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';')
      const nextLocaleCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='))
      const nextLocale = nextLocaleCookie?.split('=')[1]?.trim()
      if (nextLocale === 'pt-BR' || nextLocale === 'en') {
        return nextLocale as Locale
      }
    }
    return getLocaleFromPathname(pathname || '/')
  }

  const locale: Locale = getInitialLocale()

  // Get initial language/region state from cookie (client-side)
  const getInitialLanguageRegionState = () => {
    if (typeof document === 'undefined') return DEFAULT_STATE

    const cookies = document.cookie.split(';')
    const languageRegionCookie = cookies.find(c => c.trim().startsWith(`${LANGUAGE_REGION_COOKIE}=`))

    if (languageRegionCookie) {
      const value = languageRegionCookie.split('=')[1]
      return parseLanguageRegionCookie(value)
    }

    return DEFAULT_STATE
  }

  // Enable auto-logout for authenticated users
  useAutoLogout()

  // Debug logging for header user data
  console.log('[LAYOUT-CONTENT] User data passed to header:', {
    hasUser: !!user,
    userEmail: user?.email,
    userType,
    pathname
  })

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
