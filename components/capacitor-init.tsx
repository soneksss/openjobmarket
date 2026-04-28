"use client"

import { useEffect } from 'react'
import { syncLocation } from '@/hooks/use-trades-location-sync'

/**
 * CapacitorInit — native-shell initialisation, runs client-side only.
 *
 * Runs ONCE per app session (module-level flag prevents re-entry on
 * React re-renders or hot-reload).
 *
 * Responsibilities:
 *   1. notifyAppReady()  — resets the Capgo fail-safe rollback timer.
 *   2. One-time update check on launch — avoids repeated getLatest() calls
 *      that cause 429 rate-limit errors. autoUpdate:true in capacitor.config.ts
 *      handles background checks via our own /api/updates/channel endpoint.
 *   3. syncLocation on launch + each foreground (no update check on foreground).
 *   4. pushNotificationActionPerformed listener — navigates to the job URL
 *      embedded in the FCM data payload when user taps a notification.
 */

// Module-level flag — survives React re-renders, resets only on full page reload
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
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
        const { App }              = await import('@capacitor/app')
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // ── 1. Notify updater that this bundle is healthy (REQUIRED on every launch) ──
        await CapacitorUpdater.notifyAppReady()

        // ── 2. One-time OTA check on launch ──────────────────────────────────────
        // getLatest() is called exactly once. autoUpdate:true + channelUrl handles
        // subsequent background checks silently — no repeated calls needed here.
        try {
          const latest = await CapacitorUpdater.getLatest()
          if (latest?.url) {
            const bundle = await CapacitorUpdater.download({
              url:     latest.url,
              version: latest.version ?? 'unknown',
            })
            // Installs on next app restart — does not reload immediately
            await CapacitorUpdater.set(bundle)
          }
        } catch {
          // No update available, network error, or 429 — silent fail, never retry
        }

        // ── 3. Sync tradesperson location on launch ───────────────────────────────
        syncLocation()

        // ── 4. Foreground handler — location sync only, NO update check ──────────
        const appHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) syncLocation()
        })
        cleanupFns.push(() => appHandle.remove())

        // ── 5. Notification tap → navigate to embedded URL ───────────────────────
        const pushHandle = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            try {
              const url: string | undefined = action.notification?.data?.url
              if (!url) return
              // Navigate within the webview (strip origin, keep path + query)
              const parsed = new URL(url)
              window.location.href = parsed.pathname + parsed.search
            } catch {
              // Malformed URL — ignore
            }
          }
        )
        cleanupFns.push(() => pushHandle.remove())

      } catch {
        // Plugin not available or not in native context — no-op for web users
      }
    })()

    return () => {
      cleanupFns.forEach(fn => fn())
    }
  }, [])

  return null
}
