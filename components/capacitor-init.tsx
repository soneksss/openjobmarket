"use client"

import { useEffect } from 'react'
import { syncLocation } from '@/hooks/use-trades-location-sync'

/**
 * CapacitorInit — native-shell initialisation, runs client-side only.
 *
 * Module-level flag ensures this runs exactly once per app session regardless
 * of React re-renders, Strict Mode double-invocation, or route changes.
 *
 * Notification deep linking priority:
 *   1. data.type === 'job' + data.jobId  → /jobs/:id  (explicit, preferred)
 *   2. data.url                          → path from URL (fallback)
 *   Capacitor queues pushNotificationActionPerformed so cold-start taps
 *   (app was killed) are delivered once the listener is registered.
 */

let appInitialized = false

export function CapacitorInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!(window as any).Capacitor?.isNativePlatform?.()) return
    if (appInitialized) return
    appInitialized = true

    const cleanupFns: Array<() => void> = []

    ;(async () => {
      try {
        const { CapacitorUpdater }  = await import('@capgo/capacitor-updater')
        const { App }               = await import('@capacitor/app')
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // ── 1. Mark bundle as healthy (REQUIRED — prevents Capgo rollback) ────────
        await CapacitorUpdater.notifyAppReady()

        // ── 2. OTA handled by autoUpdate:true + custom channelUrl ─────────────────
        // No getLatest() call — it targets Capgo's cloud (rate limited, 429).

        // ── 3. Location sync on launch ───────────────────────────────────────────
        syncLocation()

        // ── 4. Foreground — location sync only ───────────────────────────────────
        const appHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) syncLocation()
        })
        cleanupFns.push(() => appHandle.remove())

        // ── 5. Notification tap — deep link into the correct screen ──────────────
        // Works for cold start AND background resume (Capacitor queues the event).
        const pushHandle = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            try {
              const data = action.notification?.data

              // Priority 1: explicit type + id deep link
              if (data?.type === 'job' && data?.jobId) {
                window.location.replace(`/jobs/${data.jobId}`)
                return
              }

              // Priority 2: URL-based fallback (keep path only, strip origin)
              if (data?.url) {
                const parsed = new URL(data.url)
                window.location.replace(parsed.pathname + parsed.search)
              }
            } catch {
              // Missing or invalid payload — ignore safely, app stays on current screen
            }
          }
        )
        cleanupFns.push(() => pushHandle.remove())

      } catch {
        // Plugin unavailable or not in native context — safe no-op for web users
      }
    })()

    return () => cleanupFns.forEach(fn => fn())
  }, [])

  return null
}
