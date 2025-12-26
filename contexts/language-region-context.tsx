"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type {
  Language,
  Country,
  LanguageRegionState
} from '@/lib/i18n/language-region'
import {
  DEFAULT_STATE,
  LANGUAGE_REGION_COOKIE,
  getLanguageRegionFromStorage,
  saveLanguageRegionToStorage,
  createLanguageRegionCookie,
  getCountryPath,
  detectBrowserLanguage,
  isFirstVisit,
} from '@/lib/i18n/language-region'
import { useI18n } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/config'
import { removeLocalePrefix, getLocalizedPath } from '@/lib/i18n/config'

interface LanguageRegionContextType {
  state: LanguageRegionState
  updateLanguageRegion: (language: Language, country: Country) => void
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
  showBrowserSuggestion: boolean
  dismissBrowserSuggestion: () => void
}

const LanguageRegionContext = createContext<LanguageRegionContextType | undefined>(undefined)

export function LanguageRegionProvider({
  children,
  initialState = DEFAULT_STATE
}: {
  children: React.ReactNode
  initialState?: LanguageRegionState
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { setLocale } = useI18n()
  const [state, setState] = useState<LanguageRegionState>(initialState)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showBrowserSuggestion, setShowBrowserSuggestion] = useState(false)

  // Initialize from cookie (priority) or localStorage, and check for browser language suggestion
  useEffect(() => {
    // First, check if NEXT_LOCALE cookie is set (from /br route via middleware)
    const cookies = document.cookie.split(';')
    const nextLocaleCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='))
    const nextLocale = nextLocaleCookie?.split('=')[1]?.trim()

    if (nextLocale === 'pt-BR') {
      // Auto-set language and region from /br route
      const newState: LanguageRegionState = { language: 'pt-BR', country: 'BR' }
      setState(newState)
      // Save to storage so it persists
      saveLanguageRegionToStorage(newState)
      // Update i18n locale
      setLocale('pt-BR')
    } else {
      // Fall back to localStorage
      const stored = getLanguageRegionFromStorage()
      if (stored) {
        setState(stored)
      } else if (isFirstVisit()) {
        // First visit - check browser language
        const browserLang = detectBrowserLanguage()
        if (browserLang === 'pt-BR' && state.language === 'en') {
          // Show suggestion for pt-BR users
          setShowBrowserSuggestion(true)
        }
      }
    }
  }, [setLocale])

  // Sync with pathname changes (e.g., when navigating from / to /br or vice versa)
  useEffect(() => {
    const cookies = document.cookie.split(';')
    const nextLocaleCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='))
    const nextLocale = nextLocaleCookie?.split('=')[1]?.trim()

    // Determine expected state based on pathname and locale cookie
    const isOnBrRoute = pathname?.startsWith('/br')
    const expectedLanguage: Language = isOnBrRoute ? 'pt-BR' : (nextLocale === 'pt-BR' ? 'pt-BR' : 'en')
    // If language is pt-BR (either from route or cookie), country should be BR
    const expectedCountry: Country = (isOnBrRoute || nextLocale === 'pt-BR') ? 'BR' : 'GLOBAL'

    // Update if state doesn't match expectations
    if (state.language !== expectedLanguage || state.country !== expectedCountry) {
      const newState: LanguageRegionState = { language: expectedLanguage, country: expectedCountry }
      setState(newState)
      saveLanguageRegionToStorage(newState)
      setLocale(expectedLanguage)
    }
  }, [pathname, state.language, state.country, setLocale])

  const updateLanguageRegion = useCallback((language: Language, country: Country) => {
    const newState = { language, country }
    const previousCountry = state.country

    // Update state
    setState(newState)

    // Save to storage
    saveLanguageRegionToStorage(newState)

    // Set cookie for server-side access
    document.cookie = `${LANGUAGE_REGION_COOKIE}=${createLanguageRegionCookie(newState)}; path=/; max-age=31536000; SameSite=Lax`

    // Set user preference cookie to prevent auto-redirect from overriding manual choice
    document.cookie = `USER_LOCALE_PREFERENCE=${language}; path=/; max-age=31536000; SameSite=Lax`

    // Update i18n locale for translations
    const i18nLocale: Locale = language === 'pt-BR' ? 'pt-BR' : 'en'
    setLocale(i18nLocale)

    // Handle country change with redirect - preserve current path
    if (country !== previousCountry) {
      // Remove current locale prefix from pathname
      const pathWithoutLocale = removeLocalePrefix(pathname || '/')

      // Add new locale prefix
      const newPath = country === 'BR'
        ? getLocalizedPath(pathWithoutLocale, 'pt-BR')
        : pathWithoutLocale // Global = no prefix

      console.log('[Language Switch] Redirecting from', pathname, 'to', newPath)
      router.push(newPath)
    } else {
      // Language-only change - just refresh to update content
      router.refresh()
    }

    // Close modal
    setIsModalOpen(false)
  }, [state.country, router, setLocale, pathname])

  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const dismissBrowserSuggestion = useCallback(() => {
    setShowBrowserSuggestion(false)
    // Mark that user has made a choice
    saveLanguageRegionToStorage(state)
  }, [state])

  return (
    <LanguageRegionContext.Provider
      value={{
        state,
        updateLanguageRegion,
        isModalOpen,
        openModal,
        closeModal,
        showBrowserSuggestion,
        dismissBrowserSuggestion,
      }}
    >
      {children}
    </LanguageRegionContext.Provider>
  )
}

export function useLanguageRegion() {
  const context = useContext(LanguageRegionContext)
  if (context === undefined) {
    throw new Error('useLanguageRegion must be used within a LanguageRegionProvider')
  }
  return context
}
