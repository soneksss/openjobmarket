"use client"

import { useEffect } from 'react'

/**
 * useNativePush — saves the FCM/APNs device token once the user is authenticated.
 *
 * Deliberately minimal: this hook only listens for the 'registration' event
 * (token emitted by the OS after register() succeeds) and POSTs it to
 * /api/push/native-subscribe.
 *
 * It does NOT call requestPermissions() or register() — those are owned by
 * CapacitorInit (capacitor-init.tsx) which runs the full push lifecycle with
 * proper lifecycle guards and debouncing.
 *
 * It does NOT add a pushNotificationActionPerformed listener — deep-link
 * navigation is also owned by CapacitorInit to prevent duplicate handlers.
 *
 * Mounted only inside the authenticated layout (NativePushManager) so the
 * token is always tied to a logged-in user session.
 */
export function useNativePush() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!(window as any).Capacitor?.isNativePlatform?.()) return

    const platform: string = (window as any).Capacitor?.getPlatform?.() ?? 'unknown'
    const deviceType = platform === 'ios' ? 'apns' : 'fcm'

    let cleanup: (() => void) | undefined

    ;(async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Listen for the token emitted by CapacitorInit's register() call.
        // If the user authenticated after register() already fired, calling
        // register() again re-emits the token — safe on both Android and iOS.
        const handle = await PushNotifications.addListener('registration', async ({ value: token }) => {
          try {
            await fetch('/api/push/native-subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, deviceType }),
            })
          } catch {
            // Silent — token will be re-registered on next app launch
          }
        })
        cleanup = () => handle.remove()

        // Re-trigger token emission in case CapacitorInit's register() fired
        // before this component mounted (i.e. user was not yet authenticated).
        await PushNotifications.register()

      } catch {
        // Plugin unavailable — safe no-op
      }
    })()

    return () => cleanup?.()
  }, [])
}
