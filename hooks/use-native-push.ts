"use client"

import { useEffect } from 'react'

/**
 * useNativePush — registers for native FCM/APNs push notifications.
 *
 * Call this hook inside an authenticated component (e.g. the dashboard layout)
 * so the token is always tied to a logged-in user.
 *
 * What it does:
 *   1. Checks we're in a Capacitor native context (no-op in browsers)
 *   2. Requests push permission from the OS
 *   3. Registers with FCM (Android) or APNs (iOS)
 *   4. On successful registration, POSTs the token to /api/push/native-subscribe
 *   5. On notification tap, navigates to the URL in notification.data.url
 *
 * The existing Web Push system (/api/push/subscribe) is untouched —
 * both systems coexist and serve different platforms.
 */
export function useNativePush() {
  useEffect(() => {
    // Guard: only run inside a Capacitor native app
    if (typeof window === 'undefined') return
    if (!(window as any).Capacitor?.isNativePlatform?.()) return

    const platform: string = (window as any).Capacitor?.getPlatform?.() ?? 'unknown'
    const deviceType = platform === 'ios' ? 'apns' : 'fcm'

    ;(async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Request permission — shows the OS dialog on first run
        const { receive } = await PushNotifications.requestPermissions()
        if (receive !== 'granted') return

        // Register with FCM / APNs — triggers the 'registration' event
        await PushNotifications.register()

        // Save the token to our backend so we can send targeted notifications
        await PushNotifications.addListener('registration', async ({ value: token }) => {
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

        // Handle notification received while app is in foreground
        await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
          // Foreground notifications are handled by the server-sent real-time
          // system (Supabase realtime). The native push is for background delivery.
        })

        // Handle notification tap — navigate to the URL in the data payload
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const url = action.notification.data?.url
          if (url && typeof window !== 'undefined') {
            window.location.href = url
          }
        })
      } catch {
        // @capacitor/push-notifications not available or permission check failed
      }
    })()

    return () => {
      // Listeners are cleaned up by Capacitor when the component unmounts
      import('@capacitor/push-notifications')
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => {})
    }
  }, [])
}
