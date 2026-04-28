"use client"

import { useEffect } from 'react'
import { syncLocation } from '@/hooks/use-trades-location-sync'

/**
 * CapacitorInit — native-shell initialisation, runs client-side only.
 *
 * Module-level flag ensures this runs exactly once per app session regardless
 * of React re-renders, Strict Mode double-invocation, or route changes.
 *
 * Update strategy:
 *   - notifyAppReady() resets Capgo's fail-safe rollback timer (REQUIRED).
 *   - autoUpdate:true in capacitor.config.ts handles OTA checks automatically
 *     via our custom /api/updates/channel endpoint — no manual getLatest() call.
 *   - getLatest() was removed: it hits Capgo's cloud API (not channelUrl) and
 *     caused 429 rate-limit errors when called on every foreground event.
 *
 * Notification tap:
 *   - Capacitor queues pushNotificationActionPerformed so it fires even on
 *     cold start (app was killed). The listener just needs to be registered.
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

        // ── 1. Mark bundle as healthy — MUST be called on every launch ───────────
        // Without this, Capgo rolls back to the previous bundle after ~10 seconds.
        await CapacitorUpdater.notifyAppReady()

        // ── 2. OTA updates are handled automatically by autoUpdate:true ──────────
        // No manual getLatest() here — that method targets Capgo's cloud API and
        // causes 429 errors. Our custom channelUrl is used by autoUpdate only.

        // ── 3. Location sync on launch ───────────────────────────────────────────
        syncLocation()

        // ── 4. Foreground — location sync only, zero update calls ────────────────
        const appHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) syncLocation()
        })
        cleanupFns.push(() => appHandle.remove())

        // ── 5. Notification tap → navigate to embedded URL ───────────────────────
        // Works for both cold start (Capacitor queues the event) and background.
        // Uses replace() so the user can use Back normally after navigating.
        const pushHandle = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            try {
              const url: string | undefined = action.notification?.data?.url
              if (!url) return
              const parsed = new URL(url)
              // Stay within the webview: navigate by path only, not full origin
              window.location.replace(parsed.pathname + parsed.search)
            } catch {
              // Malformed URL in notification payload — ignore safely
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
