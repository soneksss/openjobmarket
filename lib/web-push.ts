/**
 * Server-side Web Push helper.
 *
 * Wraps the `web-push` npm package with VAPID configuration pulled from env vars.
 * Only call this from server-side code (API routes / server actions) — never from
 * client components.
 *
 * Required env vars:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY   — base64url VAPID public key (safe to expose)
 *   VAPID_PRIVATE_KEY              — base64url VAPID private key (keep secret)
 *   VAPID_EMAIL                    — contact email, e.g. mailto:admin@openjobmarket.com
 */

import webpush from "web-push"

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY             ?? ""
const VAPID_EMAIL       = process.env.VAPID_EMAIL                   ?? "mailto:admin@openjobmarket.com"

let vapidConfigured = false
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  vapidConfigured = true
}

export interface PushPayload {
  title:              string
  body:               string
  url?:               string
  tag?:               string
  requireInteraction?: boolean
}

/**
 * Send a web push notification to a single subscription token (stored JSON string).
 *
 * Returns `true` on success, `false` on non-fatal send error.
 * Throws `SUBSCRIPTION_EXPIRED` when the endpoint is permanently gone (410/404)
 * so callers can remove the stale token from the DB.
 */
export async function sendWebPush(
  subscriptionJson: string,
  payload: PushPayload
): Promise<boolean> {
  if (!vapidConfigured) {
    console.warn("[WEB-PUSH] VAPID keys not configured — skipping push")
    return false
  }

  try {
    const subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch (err: any) {
    // 410 Gone / 404 Not Found = subscription is permanently invalid
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      throw new Error("SUBSCRIPTION_EXPIRED")
    }
    console.error("[WEB-PUSH] Send failed:", err?.message ?? err)
    return false
  }
}

/**
 * Send a push notification to all tokens belonging to a user.
 * Expired tokens are returned so callers can delete them.
 */
export async function sendWebPushToUser(
  tokens: string[],
  payload: PushPayload
): Promise<{ sent: number; expired: string[] }> {
  let sent = 0
  const expired: string[] = []

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const ok = await sendWebPush(token, payload)
        if (ok) sent++
      } catch (err: any) {
        if (err?.message === "SUBSCRIPTION_EXPIRED") {
          expired.push(token)
        }
      }
    })
  )

  return { sent, expired }
}
