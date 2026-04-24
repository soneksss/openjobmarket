/**
 * Firebase Admin SDK singleton.
 *
 * Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the full JSON content of your
 * Firebase service account key (from Firebase Console → Project Settings →
 * Service Accounts → Generate new private key).
 *
 * Returns null if the env var is not set — FCM sending is then silently skipped.
 */

import * as admin from "firebase-admin"

let app: admin.app.App | null = null

export function getFirebaseAdmin(): admin.app.App | null {
  if (app) return app

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  try {
    // Avoid re-initialising on hot-reload in dev
    if (admin.apps.length > 0) {
      app = admin.apps[0]!
      return app
    }

    const serviceAccount = JSON.parse(raw)
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    return app
  } catch (err) {
    console.error("[FIREBASE-ADMIN] Init error:", err)
    return null
  }
}

/**
 * Send an FCM push notification to one or more device tokens.
 * Returns the number of messages successfully sent.
 */
export async function sendFcmToTokens(
  tokens: string[],
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ sent: number; failed: string[] }> {
  if (tokens.length === 0) return { sent: 0, failed: [] }

  const firebaseApp = getFirebaseAdmin()
  if (!firebaseApp) {
    console.warn("[FIREBASE-ADMIN] Service account not configured — FCM skipped")
    return { sent: 0, failed: [] }
  }

  const messaging = admin.messaging(firebaseApp)
  const failed: string[] = []
  let sent = 0

  // Send to each token individually so failures don't block others
  await Promise.all(
    tokens.map(async (token) => {
      try {
        await messaging.send({
          token,
          notification: {
            title: payload.title,
            body:  payload.body,
          },
          data: {
            url: payload.url ?? "",
            tag: payload.tag ?? "",
          },
          android: {
            notification: {
              clickAction: "FLUTTER_NOTIFICATION_CLICK",
              channelId: "urgent_jobs",
            },
            priority: "high",
          },
        })
        sent++
      } catch (err: any) {
        const code = err?.code ?? ""
        // Treat stale / unregistered tokens as non-fatal
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          failed.push(token)
        } else {
          console.error(`[FIREBASE-ADMIN] FCM send error token=${token.slice(0, 20)}:`, code, err?.message)
        }
      }
    })
  )

  return { sent, failed }
}
