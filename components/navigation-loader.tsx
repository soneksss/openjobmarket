"use client"

import { useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * NavigationLoader — full-screen overlay shown between route changes.
 *
 * Trigger: click on any internal <a> link whose href differs from the
 *          current full URL (pathname + search params).
 * Dismiss: full URL changes (pathname OR query params) or 3s safety fallback.
 *
 * Fixes: same-path query-param navigations (e.g. / → /?tab=traders)
 * previously kept the overlay visible because usePathname() ignores params.
 */
function NavigationLoaderInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locationKey = pathname + '?' + searchParams.toString()

  const [visible, setVisible] = useState(false)
  const prevKey = useRef(locationKey)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Full URL changed → navigation complete → hide
  useEffect(() => {
    if (locationKey !== prevKey.current) {
      prevKey.current = locationKey
      if (timer.current) clearTimeout(timer.current)
      setVisible(false)
    }
  }, [locationKey])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank'
      ) return

      // Normalise href to compare against current full URL
      const url = new URL(href, window.location.origin)
      const hrefKey = url.pathname + '?' + url.searchParams.toString()
      if (hrefKey === locationKey) return  // same destination — no navigation

      setVisible(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setVisible(false), 3000)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [locationKey])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-[2px] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
    </div>
  )
}

// useSearchParams requires a Suspense boundary
export function NavigationLoader() {
  return (
    <Suspense>
      <NavigationLoaderInner />
    </Suspense>
  )
}
