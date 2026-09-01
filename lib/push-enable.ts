/**
 * Platform-aware push notification permission + subscription helpers.
 *
 * Used by the "Turn on notifications" control on the tradesperson dashboard.
 * The silent auto-subscribe on every load is still owned by
 * PushSubscriptionManager (web) and CapacitorInit + useNativePush (native);
 * this module is the *explicit user-initiated* path plus a permission probe.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported"

function isNative(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()
}

function webPushUsable(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    window.location.protocol !== "http:"
  )
}

/** Current permission state — does NOT prompt. */
export async function getPushPermission(): Promise<PushPermission> {
  if (typeof window === "undefined") return "unsupported"

  if (isNative()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications")
      const p = await PushNotifications.checkPermissions()
      if (p.receive === "granted") return "granted"
      if (p.receive === "denied") return "denied"
      return "prompt" // 'prompt' | 'prompt-with-rationale'
    } catch {
      return "unsupported"
    }
  }

  if (!webPushUsable()) return "unsupported"
  const p = Notification.permission
  return p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt"
}

/**
 * Explicit user action: request permission (if not already answered) and, on
 * success, make sure a delivery token/subscription is registered.
 * Returns the resulting permission state.
 */
export async function enablePush(): Promise<PushPermission> {
  if (typeof window === "undefined") return "unsupported"

  if (isNative()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications")
      let recv = (await PushNotifications.checkPermissions()).receive
      if (recv !== "granted" && recv !== "denied") {
        recv = (await PushNotifications.requestPermissions()).receive
      }
      if (recv === "granted") {
        // useNativePush()'s 'registration' listener persists the emitted token.
        await PushNotifications.register()
        return "granted"
      }
      return recv === "denied" ? "denied" : "prompt"
    } catch {
      return "unsupported"
    }
  }

  return subscribeWebPush()
}

async function subscribeWebPush(): Promise<PushPermission> {
  if (!VAPID_PUBLIC_KEY || !webPushUsable()) return "unsupported"
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    await navigator.serviceWorker.ready

    if (Notification.permission === "denied") return "denied"

    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      await saveWebSubscription(existing)
      return "granted"
    }

    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission()
    if (permission !== "granted") return permission === "denied" ? "denied" : "prompt"

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    })
    await saveWebSubscription(sub)
    return "granted"
  } catch {
    return "unsupported"
  }
}

async function saveWebSubscription(subscription: PushSubscription): Promise<void> {
  try {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    })
  } catch {
    /* silent — retried by PushSubscriptionManager on next load */
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
