/**
 * Unified native push sender.
 *
 *   device_type = 'fcm'  → Android → Firebase Admin (lib/firebase-admin.ts)
 *   device_type = 'apns' → iOS     → direct APNs   (lib/apns.ts)
 *
 * Web Push (`device_type = 'web'`) is handled separately by each caller via
 * lib/web-push.ts and is intentionally NOT touched here.
 *
 * Callers pass the raw `{ token, device_type }[]` rows and get back a single
 * `failed` list of tokens that are permanently invalid and should be deleted —
 * identical semantics to the previous `sendFcmToTokens(...).failed`.
 */

import { sendFcmToTokens } from "@/lib/firebase-admin"
import { sendApnsToTokens } from "@/lib/apns"

interface NativeTokenRow {
  token: string
  device_type: string
}

interface NativePayload {
  title: string
  body: string
  url?: string
  tag?: string
  jobId?: string
}

export async function sendNativePush(
  rows: NativeTokenRow[],
  payload: NativePayload,
): Promise<{ sent: number; failed: string[] }> {
  const fcm = rows.filter((r) => r.device_type === "fcm").map((r) => r.token)
  const apns = rows.filter((r) => r.device_type === "apns").map((r) => r.token)

  const [fcmRes, apnsRes] = await Promise.all([
    fcm.length ? sendFcmToTokens(fcm, payload) : Promise.resolve({ sent: 0, failed: [] as string[] }),
    apns.length ? sendApnsToTokens(apns, payload) : Promise.resolve({ sent: 0, failed: [] as string[] }),
  ])

  return { sent: fcmRes.sent + apnsRes.sent, failed: [...fcmRes.failed, ...apnsRes.failed] }
}
