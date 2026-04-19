"use client"

import { useEffect } from 'react'

/**
 * CapacitorInit — native-shell initialisation, runs client-side only.
 *
 * Responsibilities:
 *   1. Calls CapacitorUpdater.notifyAppReady() — CRITICAL.
 *      Without this call, the updater rolls back to the previous bundle
 *      after 10 seconds (fail-safe). Must be called every time the app starts.
 *
 *   2. Checks for a new OTA bundle when the app comes to the foreground.
 *      If a new bundle is available (APP_BUNDLE_VERSION env var was bumped),
 *      it is downloaded silently and installed on the next app restart.
 *
 * This component is mounted via dynamic import with ssr:false so it never
 * runs during SSR and never affects web-browser users.
 *
 * All @capacitor imports are dynamic so the module is tree-shaken from the
 * web bundle entirely.
 */
export function CapacitorInit() {
  useEffect(() => {
    // Guard: only run inside a real Capacitor native context
    if (typeof window === 'undefined') return
    if (!(window as any).Capacitor?.isNativePlatform?.()) return

    let cleanupFn: (() => void) | undefined

    ;(async () => {
      try {
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
        const { App } = await import('@capacitor/app')

        // STEP 1: Notify the updater that this bundle loaded successfully.
        // This resets the fail-safe rollback timer. Must be called on every launch.
        await CapacitorUpdater.notifyAppReady()

        // STEP 2: Check for updates when app is foregrounded.
        const handle = await App.addListener('appStateChange', async ({ isActive }) => {
          if (!isActive) return
          try {
            // The updater reads channelUrl from capacitor.config.ts automatically.
            // If the server returns a newer version, it downloads it in the background.
            const latest = await CapacitorUpdater.getLatest()
            if (latest?.url) {
              const bundle = await CapacitorUpdater.download({
                url: latest.url,
                version: latest.version ?? 'unknown',
              })
              // Set as next bundle — takes effect on next app restart
              await CapacitorUpdater.set(bundle)
            }
          } catch {
            // Network error or no update available — silent fail, do not block the user
          }
        })

        cleanupFn = () => handle.remove()
      } catch {
        // Plugin not installed or not in native context — no-op
      }
    })()

    return () => {
      cleanupFn?.()
    }
  }, [])

  // Renders nothing — purely side-effect component
  return null
}
