"use client"

/**
 * PushSubscriptionManager
 *
 * Silently registers the browser's service worker, requests push permission,
 * and persists the PushSubscription to the server so the dispatch-urgent route
 * can send real browser push notifications when the user is offline or the tab
 * is in the background.
 *
 * Mount once for company (tradesperson) users — see layout-content.tsx.
 * Renders nothing visible.
 */

import { useEffect } from "react"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

/** Convert VAPID base64url key to Uint8Array (required by PushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function saveSubscription(subscription: PushSubscription) {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription }),
  })
}

export function PushSubscriptionManager() {
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    // Web Push requires HTTPS — skip silently on plain HTTP (localhost dev)
    if (window.location.protocol === "http:") return

    async function setup() {
      try {
        // Register (or reuse) the service worker
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
        await navigator.serviceWorker.ready

        // Don't ask again if already denied
        if (Notification.permission === "denied") return

        // Check if we already have a valid subscription — re-register to keep DB fresh
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          await saveSubscription(existing)
          return
        }

        // For the "Uber experience": request permission right away.
        // Tradespeople need to receive alerts even when the tab is closed.
        const permission = await Notification.requestPermission()
        if (permission !== "granted") return

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
        })

        await saveSubscription(subscription)
      } catch (err) {
        // Non-fatal — in-app notifications still work as fallback
        console.warn("[PUSH] Setup failed:", err)
      }
    }

    setup()
  }, [])

  return null
}
