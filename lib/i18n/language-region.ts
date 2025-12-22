/**
 * Language & Region Management
 * Handles language and country selection with persistence
 */

export type Language = 'en' | 'pt-BR'
export type Country = 'GLOBAL' | 'BR'

export interface LanguageRegionState {
  language: Language
  country: Country
}

export const LANGUAGE_REGION_COOKIE = 'language-region'

// Default state
export const DEFAULT_STATE: LanguageRegionState = {
  language: 'en',
  country: 'GLOBAL',
}

// Available options
export const LANGUAGES = [
  { code: 'en' as Language, name: 'English' },
  { code: 'pt-BR' as Language, name: 'Português (Brasil)' },
] as const

export const COUNTRIES = [
  { code: 'GLOBAL' as Country, name: 'Global' },
  { code: 'BR' as Country, name: 'Brasil' },
] as const

/**
 * Get display text for current selection
 */
export function getDisplayText(state: LanguageRegionState): string {
  const langCode = state.language === 'en' ? 'EN' : 'PT-BR'
  const countryName = state.country === 'GLOBAL' ? 'Global' : 'Brasil'
  return `${langCode} · ${countryName}`
}

/**
 * Get URL path for country
 */
export function getCountryPath(country: Country): string {
  return country === 'BR' ? '/br' : '/'
}

/**
 * Detect browser language
 */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en'

  const browserLang = navigator.language || (navigator as any).userLanguage

  if (browserLang?.toLowerCase().includes('pt-br') || browserLang?.toLowerCase().includes('pt')) {
    return 'pt-BR'
  }

  return 'en'
}

/**
 * Parse state from cookie string
 */
export function parseLanguageRegionCookie(cookieValue: string): LanguageRegionState {
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue))
    return {
      language: parsed.language || DEFAULT_STATE.language,
      country: parsed.country || DEFAULT_STATE.country,
    }
  } catch {
    return DEFAULT_STATE
  }
}

/**
 * Create cookie string from state
 */
export function createLanguageRegionCookie(state: LanguageRegionState): string {
  return encodeURIComponent(JSON.stringify(state))
}

/**
 * Get state from localStorage (client-side fallback)
 */
export function getLanguageRegionFromStorage(): LanguageRegionState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(LANGUAGE_REGION_COOKIE)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Save state to localStorage
 */
export function saveLanguageRegionToStorage(state: LanguageRegionState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(LANGUAGE_REGION_COOKIE, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save language/region to localStorage:', error)
  }
}

/**
 * Check if first visit (no stored preference)
 */
export function isFirstVisit(): boolean {
  if (typeof window === 'undefined') return true

  try {
    const stored = localStorage.getItem(LANGUAGE_REGION_COOKIE)
    const hasStoredPreference = !!stored
    return !hasStoredPreference
  } catch {
    return true
  }
}

/**
 * Get default map center coordinates based on country
 * Returns [latitude, longitude]
 */
export function getDefaultMapCenter(country: Country): [number, number] {
  switch (country) {
    case 'BR':
      return [-23.5505, -46.6333] // São Paulo, Brazil
    case 'GLOBAL':
    default:
      return [51.5074, -0.1278] // London, UK
  }
}
