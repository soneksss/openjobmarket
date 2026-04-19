"use client"

import { useEffect, useRef } from "react"

const HEARTBEAT_INTERVAL = 60_000 // 60 s

export function usePresence(userId: string | null | undefined) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const beat = () => {
    if (!userId) return
    // keepalive: true lets the request complete even if the tab closes mid-flight
    fetch("/api/presence/heartbeat", { method: "POST", keepalive: true }).catch(() => {
      // silent — a failed heartbeat is never worth surfacing to the user
    })
  }

  useEffect(() => {
    if (!userId) return

    beat() // fire immediately on mount / user change

    timerRef.current = setInterval(beat, HEARTBEAT_INTERVAL)

    const onVisibility = () => {
      if (document.visibilityState === "visible") beat()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [userId])
}
