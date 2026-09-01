"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, MapPin, Bell, BellOff, Loader2 } from "lucide-react"
import { getPushPermission, enablePush, type PushPermission } from "@/lib/push-enable"

/**
 * Amber "you may be missing job alerts" strip on the tradesperson dashboard.
 * Shows ONLY when something is actually wrong and fixable:
 *   • no work location set  → link to profile edit
 *   • push permission not granted:
 *       - "prompt"  → a one-tap button that requests permission + subscribes
 *       - "denied"  → clear instructions to re-enable in device/browser settings
 * Renders nothing when location is set AND push is granted / unsupported /
 * still being checked.
 */
export function JobAlertHealthBanner({
  hasLocation,
  editProfileHref = "/company/profile/edit",
}: {
  hasLocation: boolean
  editProfileHref?: string
}) {
  const [perm, setPerm] = useState<PushPermission | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const refresh = () => { getPushPermission().then(setPerm).catch(() => setPerm(null)) }
    refresh()
    // Re-check when the user comes back from device settings.
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [])

  const isNative =
    typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.()

  const handleEnable = async () => {
    setBusy(true)
    try {
      setPerm(await enablePush())
    } finally {
      setBusy(false)
    }
  }

  const needsPermission = perm === "prompt" || perm === "denied"
  if (!(!hasLocation || needsPermission)) return null

  return (
    <div className="bg-amber-500/15 border-y border-amber-500/30">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 flex-shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" /> You may be missing job alerts
          </span>

          {!hasLocation && (
            <Link
              href={editProfileHref}
              className="flex items-center gap-1 text-xs text-amber-200/90 hover:text-white underline underline-offset-2"
            >
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> Add your work location so nearby jobs reach you
            </Link>
          )}

          {perm === "prompt" && (
            <button
              onClick={handleEnable}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-100 hover:text-white bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/40 rounded-full px-2.5 py-1 transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              Turn on notifications
            </button>
          )}

          {perm === "denied" && (
            <span className="flex items-start gap-1 text-xs text-amber-200/90 leading-snug">
              <BellOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Notifications are blocked. Enable them for Open Job Market in your{" "}
                {isNative
                  ? "phone Settings → Apps → Open Job Market → Notifications"
                  : "browser site settings"}
                , then reopen this page.
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
