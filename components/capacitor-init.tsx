"use client"

import { useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { syncLocation } from '@/hooks/use-trades-location-sync'

/**
 * CapacitorInit — native-shell initialisation, runs client-side only.
 *
 * Module-level state (not React state) — nothing here ever triggers a re-render.
 *
 * Guards:
 *   isAppActive     — false while backgrounded; blocks all bridge calls
 *   isTransitioning — true for 500ms after every background↔foreground switch
 *   lastStateChange — debounces rapid appStateChange toggles (<500ms apart)
 *   locationSynced  — geolocation requested at most once per cold start
 *   pendingNavPath  — tap path that arrived mid-transition; replayed once stable
 *   navigateTo      — router.replace reference, always kept current
 *
 * Notification deep linking priority:
 *   1. data.type === 'job' + data.jobId  → /jobs/:id
 *   2. data.url                          → path from URL
 */

let appInitialized          = false
let isAppActive             = true   // app always starts in foreground
let isTransitioning         = false  // blocks bridge calls during lifecycle switch
let locationSynced          = false  // geolocation requested at most once per session
let lastStateChange         = 0      // timestamp of last appStateChange event
let transitionTimer:          ReturnType<typeof setTimeout> | null = null
let pendingNavPath:           string | null = null  // tap received during transition
let pendingNavFallbackTimer:  ReturnType<typeof setTimeout> | null = null
let navigateTo:               ((path: string) => void) | null = null
let lastHandledNotifId:       string | null = null  // dedup guard

/** True only when WebView is fully active and stable. */
function canBridge(): boolean {
  return isAppActive && !isTransitioning
}

/** Debounced state-change handler. Sets transition guard on every toggle. */
function handleStateChange(isActive: boolean) {
  const now = Date.now()
  if (now - lastStateChange < 500) return  // ignore rapid toggles
  lastStateChange = now

  isAppActive     = isActive
  isTransitioning = true
  if (transitionTimer) clearTimeout(transitionTimer)
  transitionTimer = setTimeout(() => {
    isTransitioning = false
    // Replay any notification tap that arrived while WebView was transitioning
    if (pendingNavPath && isAppActive && navigateTo) {
      const path = pendingNavPath
      pendingNavPath = null
      navigateTo(path)
    }
  }, 500)
}

/** Perform navigation and clear any pending fallback timer. */
function doNavigate(path: string) {
  if (pendingNavFallbackTimer) {
    clearTimeout(pendingNavFallbackTimer)
    pendingNavFallbackTimer = null
  }
  pendingNavPath = null
  navigateTo!(path)
}

/** Resolve tap payload → path, then navigate or queue for after transition. */
function handleNotificationTap(action: any) {
  try {
    const data     = action.notification?.data
    const notifId: string | undefined = action.notification?.id ?? data?.id

    // Dedup — Android can occasionally deliver the same tap event twice
    if (notifId && notifId === lastHandledNotifId) return
    if (notifId) lastHandledNotifId = notifId

    let path: string | null = null
    if (data?.type === 'job' && data?.jobId) {
      path = `/jobs/${data.jobId}`
    } else if (data?.url) {
      const parsed = new URL(data.url)
      path = parsed.pathname + parsed.search
    }

    if (!path) return

    if (canBridge() && navigateTo) {
      doNavigate(path)
    } else {
      // Queue for replay once WebView stabilises (transitionTimer callback).
      // Fallback: fire unconditionally after 1500ms so the tap is never lost.
      pendingNavPath = path
      if (pendingNavFallbackTimer) clearTimeout(pendingNavFallbackTimer)
      pendingNavFallbackTimer = setTimeout(() => {
        if (pendingNavPath && navigateTo) {
          doNavigate(pendingNavPath)
        }
      }, 1500)
    }
  } catch {
    // Invalid payload — stay on current screen
  }
}

export function CapacitorInit() {
  const router = useRouter()

  // Keep navigateTo always pointing to the live router instance.
  // Runs on every router identity change (practically once per mount).
  useEffect(() => {
    navigateTo = (path) => startTransition(() => router.replace(path))
  }, [router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!(window as any).Capacitor?.isNativePlatform?.()) return
    if (appInitialized) return
    appInitialized = true

    // Remove tap flash on Android WebView — eliminates perceived input lag
    ;(document.body.style as any).webkitTapHighlightColor = 'transparent'

    // Suppress verbose logs in production — small but real CPU/memory saving
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line no-console
      console.log = () => {}
      // eslint-disable-next-line no-console
      console.warn = () => {}
      // Keep console.error so crashes remain visible in Crashlytics logcat
    }

    // Global error visibility — dev only
    if (process.env.NODE_ENV !== 'production') {
      window.onerror = (_msg, _src, _line, _col, err) => {
        console.error('[CapacitorInit] onerror:', err)
      }
      window.onunhandledrejection = (e) => {
        console.error('[CapacitorInit] unhandledrejection:', e.reason)
      }
    }

    // Fade in after first paint — prevents blank white flash on cold start
    document.body.style.opacity = '0'
    const onLoad = () => {
      document.body.style.transition = 'opacity 200ms ease'
      document.body.style.opacity    = '1'
    }
    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
    }

    const cleanupFns: Array<() => void> = []

    ;(async () => {
      try {
        const { CapacitorUpdater }  = await import('@capgo/capacitor-updater')
        const { App }               = await import('@capacitor/app')
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // ── 1. Mark bundle healthy — once on cold start, never repeated ──────────
        await CapacitorUpdater.notifyAppReady()

        // ── 2. Location sync — once per cold start, never on resume ──────────────
        if (!locationSynced) {
          locationSynced = true
          syncLocation()
        }

        // ── 3. Lifecycle tracking — debounced, no React state changes ────────────
        // On foreground restore: refresh session (token may have expired while backgrounded)
        // and reconnect Supabase Realtime (WebSocket closes after ~60s in background).
        const appHandle = await App.addListener('appStateChange', async ({ isActive }) => {
          handleStateChange(isActive)
          if (isActive) {
            try {
              const { createClient } = await import('@/lib/client')
              const supabase = createClient()
              // Refresh token if expired — no-op if still valid
              await supabase.auth.getSession()
              // Reconnect realtime channels that disconnected while backgrounded
              supabase.realtime.connect()
            } catch {
              // Non-fatal — next user action will re-establish session
            }
          }
        })
        cleanupFns.push(() => appHandle.remove())

        // ── 4. Notification tap — guarded, queued if mid-transition ──────────────
        // Single source of truth for push navigation — no other listeners exist.
        const pushHandle = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => handleNotificationTap(action)
        )
        cleanupFns.push(() => pushHandle.remove())

        // ── 5. Push registration — all platforms, delayed, permission-gated ────
        // Android 13+ (API 33+): must call requestPermissions() before register().
        // On older APIs and iOS, requestPermissions() resolves immediately.
        // Delay 3 s and verify an active session first — avoids the permission
        // popup appearing before the auth screen has loaded.
        setTimeout(async () => {
          if (!canBridge()) return
          try {
            const { createClient: getClient } = await import('@/lib/client')
            const { data: { session } } = await getClient().auth.getSession()
            if (!session) return  // not logged in — skip until next cold start
            const permResult = await PushNotifications.requestPermissions()
            if (permResult.receive === 'granted') {
              await PushNotifications.register()
            }
          } catch (e) {
            console.error('[CapacitorInit] Push registration failed:', e)
          }
        }, 3000)

        if (Capacitor.getPlatform() === 'android') {
          // Create notification channel so push notifications are delivered in
          // the background with high importance. Must match the channelId used
          // in FCM payloads (lib/firebase-admin.ts → android.notification.channelId).
          try {
            await PushNotifications.createChannel({
              id: 'urgent_jobs',
              name: 'Job Alerts',
              description: 'Job matches and application updates',
              importance: 4,   // IMPORTANCE_HIGH — shows heads-up notification
              visibility: 1,   // VISIBILITY_PUBLIC
              sound: 'default',
              vibration: true,
              lights: true,
            })
          } catch {
            // Channel creation is best-effort; older Capacitor versions may lack createChannel
          }

          // ── 6. Swipe-back gesture — left-edge swipe triggers history.back() ─────
          // Guards against accidental triggers:
          //   - velocity > 0.3 px/ms  (slow drag ignored)
          //   - elapsed  < 600ms      (very slow press-and-drag ignored)
          //   - dy < 60px             (vertical scroll ignored)
          //   - must start at left edge < 40px
          //   - [data-no-swipe-back] ancestor opt-out for horizontal carousels
          let swipeStartX    = 0
          let swipeStartY    = 0
          let swipeStartTime = 0

          const onTouchStart = (e: TouchEvent) => {
            swipeStartX    = e.touches[0].clientX
            swipeStartY    = e.touches[0].clientY
            swipeStartTime = Date.now()
          }
          const onTouchEnd = (e: TouchEvent) => {
            if (!canBridge()) return
            const elapsed  = Date.now() - swipeStartTime
            const dx       = e.changedTouches[0].clientX - swipeStartX
            const dy       = Math.abs(e.changedTouches[0].clientY - swipeStartY)
            const velocity = dx / Math.max(elapsed, 1)  // px/ms

            // Opt-out: any ancestor with [data-no-swipe-back] blocks the gesture
            if ((e.target as Element | null)?.closest('[data-no-swipe-back]')) return

            if (swipeStartX < 40 && dx > 80 && dy < 60 && velocity > 0.3 && elapsed < 600) {
              window.history.back()
            }
          }
          window.addEventListener('touchstart', onTouchStart, { passive: true })
          window.addEventListener('touchend',   onTouchEnd,   { passive: true })
          cleanupFns.push(() => {
            window.removeEventListener('touchstart', onTouchStart)
            window.removeEventListener('touchend',   onTouchEnd)
          })
        }

      } catch {
        // Plugin unavailable or not in native context — safe no-op
      }
    })()

    return () => cleanupFns.forEach(fn => fn())
  }, [])

  return null
}
