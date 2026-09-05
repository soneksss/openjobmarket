/**
 * Direct Apple Push Notification service (APNs) sender — token-based auth.
 *
 * iOS devices register with `@capacitor/push-notifications`, which returns the
 * RAW APNs device token (a hex string), stored as `device_type = 'apns'`.
 * Those tokens are NOT FCM registration tokens and must never be passed to
 * Firebase Admin — they go straight to Apple here.
 *
 * Uses Node's built-in `http2` + `crypto` (APNs requires HTTP/2). No extra
 * dependency, no Firebase iOS SDK, no GoogleService-Info.plist.
 *
 * Env vars (server only — never expose to the client):
 *   APNS_KEY_ID       10-char Key ID of the APNs Auth Key (.p8)
 *   APNS_TEAM_ID      10-char Apple Developer Team ID
 *   APNS_PRIVATE_KEY  full contents of the .p8 file (-----BEGIN PRIVATE KEY----- …)
 *                     literal "\n" sequences are accepted
 *   APNS_BUNDLE_ID    optional, defaults to com.openjobmarket.app
 *   APNS_PRODUCTION   "true" → api.push.apple.com, else sandbox
 *
 * If APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY are not all set, sending is
 * silently skipped (mirrors lib/firebase-admin.ts behaviour).
 */

import http2 from "node:http2"
import crypto from "node:crypto"

const KEY_ID = process.env.APNS_KEY_ID
const TEAM_ID = process.env.APNS_TEAM_ID
const PRIVATE_KEY = process.env.APNS_PRIVATE_KEY
const BUNDLE_ID = process.env.APNS_BUNDLE_ID || "com.openjobmarket.app"
const HOST = process.env.APNS_PRODUCTION === "true"
  ? "https://api.push.apple.com"
  : "https://api.sandbox.push.apple.com"

export function apnsConfigured(): boolean {
  return !!(KEY_ID && TEAM_ID && PRIVATE_KEY)
}

// APNs allows a provider JWT to be reused for up to 60 min. Cache ~50 min.
let cachedJwt: { token: string; issuedAt: number } | null = null

function providerToken(): string {
  const now = Math.floor(Date.now() / 1000)
  if (cachedJwt && now - cachedJwt.issuedAt < 3000) return cachedJwt.token

  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url")

  const signingInput = `${b64url({ alg: "ES256", kid: KEY_ID })}.${b64url({ iss: TEAM_ID, iat: now })}`
  const key = PRIVATE_KEY!.includes("\\n")
    ? PRIVATE_KEY!.replace(/\\n/g, "\n")
    : PRIVATE_KEY!
  // ES256 = ECDSA P-256 + SHA-256, JOSE requires the raw R||S ("ieee-p1363") form.
  const signature = crypto
    .sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" })
    .toString("base64url")

  const token = `${signingInput}.${signature}`
  cachedJwt = { token, issuedAt: now }
  return token
}

interface ApnsPayload {
  title: string
  body: string
  url?: string
  tag?: string
  jobId?: string
}

/**
 * Send an alert push to one or more APNs device tokens.
 * Same signature/return shape as sendFcmToTokens() so callers route uniformly.
 * `failed` = tokens Apple says are permanently invalid — safe to delete.
 */
export async function sendApnsToTokens(
  tokens: string[],
  payload: ApnsPayload,
): Promise<{ sent: number; failed: string[] }> {
  if (tokens.length === 0) return { sent: 0, failed: [] }

  if (!apnsConfigured()) {
    console.warn("[APNS] Auth key not configured — APNs push skipped")
    return { sent: 0, failed: [] }
  }

  let jwt: string
  try {
    jwt = providerToken()
  } catch (err) {
    console.error("[APNS] Failed to sign provider token:", err)
    return { sent: 0, failed: [] }
  }

  // Custom keys sit at the top level, alongside `aps`. Capacitor iOS surfaces
  // them as `notification.data.*` — the same keys FCM `data` uses on Android,
  // so the existing tap handler (data.type / data.jobId / data.url) works as-is.
  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      "mutable-content": 1,
    },
    url: payload.url ?? "",
    tag: payload.tag ?? "",
    type: payload.jobId ? "job" : "",
    jobId: payload.jobId ?? "",
  })

  let client: http2.ClientHttp2Session
  try {
    client = http2.connect(HOST)
  } catch (err) {
    console.error("[APNS] http2 connect failed:", err)
    return { sent: 0, failed: [] }
  }

  const failed: string[] = []
  let sent = 0

  const sendOne = (token: string) =>
    new Promise<void>((resolve) => {
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
      })

      let status = 0
      let resBody = ""
      req.setEncoding("utf8")
      req.on("response", (headers) => { status = Number(headers[":status"]) || 0 })
      req.on("data", (chunk) => { resBody += chunk })
      req.on("end", () => {
        if (status === 200) {
          sent++
        } else {
          let reason = ""
          try { reason = JSON.parse(resBody)?.reason ?? "" } catch { /* non-JSON */ }
          // Permanently-dead tokens → caller deletes them.
          if (
            status === 410 ||
            reason === "BadDeviceToken" ||
            reason === "Unregistered" ||
            reason === "DeviceTokenNotForTopic"
          ) {
            failed.push(token)
          } else {
            console.error(`[APNS] send failed status=${status} reason=${reason} token=${token.slice(0, 12)}…`)
          }
        }
        resolve()
      })
      req.on("error", (err) => {
        console.error(`[APNS] request error token=${token.slice(0, 12)}…:`, err.message)
        resolve()
      })

      req.setTimeout(10_000, () => { req.close(http2.constants.NGHTTP2_CANCEL); resolve() })
      req.end(body)
    })

  try {
    await Promise.all(tokens.map(sendOne))
  } finally {
    client.close()
  }

  return { sent, failed }
}
