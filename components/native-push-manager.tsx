"use client"

import { useNativePush } from '@/hooks/use-native-push'

/**
 * NativePushManager — mounts the useNativePush hook as a render-less component.
 *
 * Follows the same pattern as PushSubscriptionManager (web push).
 * Mount this inside the authenticated section of LayoutContent so the FCM/APNs
 * token is always tied to a logged-in user.
 *
 * No-op in browsers — all Capacitor guards are inside useNativePush.
 */
export function NativePushManager() {
  useNativePush()
  return null
}
