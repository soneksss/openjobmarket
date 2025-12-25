import { headers } from 'next/headers'

/**
 * Get the locale-aware sign-up URL for redirecting unauthenticated users
 * Detects if user is on /br route and returns appropriate sign-up path
 *
 * @returns '/auth/sign-up' or '/br/auth/sign-up' based on current locale
 */
export async function getSignUpUrl(): Promise<string> {
  const headersList = await headers()

  // Check if we're on a /br route by examining:
  // 1. The x-pathname header (if set by middleware)
  // 2. The referer header
  // 3. The NEXT_LOCALE cookie

  const pathname = headersList.get('x-pathname') || headersList.get('referer') || ''
  const localeCookie = headersList.get('cookie')?.split(';')
    .find(c => c.trim().startsWith('NEXT_LOCALE='))
    ?.split('=')[1]

  const isBrazilRoute = pathname.includes('/br') || localeCookie === 'pt-BR'

  return isBrazilRoute ? '/br/auth/sign-up' : '/auth/sign-up'
}
