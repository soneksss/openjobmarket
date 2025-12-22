// i18n Configuration for OpenJobMarket
// Supports: English (default) and Portuguese (Brazil)

export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'pt-BR'],
  localeDetection: true,
} as const

export type Locale = (typeof i18n)['locales'][number]

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'pt-BR': 'Português (Brasil)',
}

export const localeFlags: Record<Locale, string> = {
  'en': '🌐', // Global/UK flag
  'pt-BR': '🇧🇷', // Brazil flag
}

// Map route prefix to locale
export const routeToLocale: Record<string, Locale> = {
  '': 'en',       // Default route (no prefix) = English
  'br': 'pt-BR',  // /br route = Portuguese (Brazil)
}

// Map locale to route prefix
export const localeToRoute: Record<Locale, string> = {
  'en': '',       // English has no prefix
  'pt-BR': 'br',  // Portuguese (Brazil) uses /br
}

/**
 * Get locale from route path
 * @param pathname - The URL pathname
 * @returns The detected locale or default locale
 */
export function getLocaleFromPathname(pathname: string): Locale {
  // Remove leading slash
  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname

  // Check if path starts with 'br'
  if (path === 'br' || path.startsWith('br/')) {
    return 'pt-BR'
  }

  return 'en'
}

/**
 * Get locale from Accept-Language header
 * @param acceptLanguage - The Accept-Language header value
 * @returns The detected locale or default locale
 */
export function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return i18n.defaultLocale

  // Check for Brazilian Portuguese
  if (acceptLanguage.includes('pt-BR') || acceptLanguage.includes('pt_BR')) {
    return 'pt-BR'
  }

  // Check for generic Portuguese and assume Brazil
  if (acceptLanguage.startsWith('pt')) {
    return 'pt-BR'
  }

  return i18n.defaultLocale
}

/**
 * Get path with locale prefix
 * @param path - The path to prefix
 * @param locale - The locale
 * @returns The prefixed path
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  const prefix = localeToRoute[locale]

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // If no prefix (English), return path as is
  if (!prefix) return normalizedPath

  // Add prefix
  return `/${prefix}${normalizedPath}`
}

/**
 * Remove locale prefix from path
 * @param pathname - The pathname with potential locale prefix
 * @returns The path without locale prefix
 */
export function removeLocalePrefix(pathname: string): string {
  // Check if path starts with /br
  if (pathname.startsWith('/br/')) {
    return pathname.slice(3) // Remove '/br'
  }
  if (pathname === '/br') {
    return '/'
  }

  return pathname
}
