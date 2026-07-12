"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const VISITOR_ID_KEY = "ojm_visitor_id"

function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable (private mode, etc.) — one-off id, just skip persistence.
    return crypto.randomUUID()
  }
}

/**
 * First-party pageview tracker. Mounted once near the app root; logs a
 * pageview on initial load and on every client-side route change. Skips
 * admin routes so admin usage doesn't pollute visitor stats.
 */
export function PageviewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return
    const visitorId = getOrCreateVisitorId()
    fetch("/api/track/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, visitorId }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
