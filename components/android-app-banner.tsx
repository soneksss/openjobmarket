"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { PLAY_STORE_URL } from "@/lib/app-links"
import { isPwaInstalled } from "@/lib/is-pwa-installed"

// "Get the app" bar for Android browsers (Chrome has no built-in app banner
// like Safari's). Shown from the visitor's second page — never on arrival —
// and hidden for 30 days once closed or tapped. Never inside the app itself.

const HIDDEN_UNTIL_KEY = "ojmAppBannerHiddenUntil"
const PAGE_VIEWS_KEY = "ojmPageViews"
const HIDE_MS = 30 * 24 * 60 * 60 * 1000

function read(storage: Storage, key: string): string | null {
  try { return storage.getItem(key) } catch { return null }
}
function write(storage: Storage, key: string, value: string) {
  try { storage.setItem(key, value) } catch { /* private mode */ }
}

export function AndroidAppBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!/Android/i.test(navigator.userAgent)) return
    if ((window as any).Capacitor?.isNativePlatform?.()) return
    if (isPwaInstalled()) return
    if (pathname?.startsWith("/auth") || pathname?.startsWith("/admin")) { setVisible(false); return }
    if (Number(read(localStorage, HIDDEN_UNTIL_KEY) ?? 0) > Date.now()) return

    const views = Number(read(sessionStorage, PAGE_VIEWS_KEY) ?? 0) + 1
    write(sessionStorage, PAGE_VIEWS_KEY, String(views))
    if (views >= 2) setVisible(true)
  }, [pathname])

  const hide = () => {
    write(localStorage, HIDDEN_UNTIL_KEY, String(Date.now() + HIDE_MS))
    setVisible(false)
  }

  if (!visible) return null

  return (
    // Sits just above the mobile bottom nav (h-14 + safe area).
    <div className="fixed left-0 right-0 z-[60] px-3 md:hidden" style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 8px)" }}>
      <div className="mx-auto max-w-md flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-2xl shadow-black/40 border border-slate-200">
        <img src="/Logo_512_512.png" alt="" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight">Get the Open Job Market app</p>
          <p className="text-xs text-slate-500 leading-tight mt-0.5">Instant alerts for jobs and messages</p>
        </div>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={hide}
          className="flex-shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
          Get
        </a>
        <button type="button" onClick={hide} aria-label="Close"
          className="flex-shrink-0 w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
