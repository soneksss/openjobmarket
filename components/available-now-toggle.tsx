"use client"

import { useEffect, useRef, useState } from "react"
import { Clock } from "lucide-react"
import { useAvailableNow } from "@/contexts/available-now-context"

// "Available now" bar (Uber/Bolt-style go-live switch). The whole bar is the
// button. Reads/writes the shared AvailableNowContext, so flipping it anywhere
// updates every copy instantly. Renders nothing for non-tradesperson accounts.
//
//  • variant "header": compact, centred in the desktop site header.
//  • variant "map": full-width, at the top of the map screens on phones (the
//    site header is hidden there). Publishes its height as --ojm-avail-bar-h
//    so the map's zoom buttons and list sheet sit below it.
//  • variant "card": the same full-width bar on the account page.

function liveFor(since: string | null, now: number): string | null {
  if (!since) return null
  const mins = Math.max(1, Math.floor((now - new Date(since).getTime()) / 60_000))
  const h = Math.floor(mins / 60)
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`
}

function clockTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export function AvailableNowToggle({ variant = "header", className = "" }: { variant?: "header" | "map" | "card"; className?: string }) {
  const { ready, isCompany, enabled, saving, expiresAt, since, toggle } = useAvailableNow()
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrapRef = useRef<HTMLDivElement>(null)
  const visible = ready && isCompany

  // "Live for …" moves once a minute — no per-second re-render.
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [enabled])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (variant !== "map") return
    const el = wrapRef.current
    const root = document.documentElement
    if (!el) { root.style.setProperty("--ojm-avail-bar-h", "0px"); return }
    // offsetHeight is 0 while hidden (md:hidden on wider screens).
    const publish = () => root.style.setProperty("--ojm-avail-bar-h", el.offsetHeight ? `${el.offsetHeight + 6}px` : "0px")
    publish()
    const obs = new ResizeObserver(publish)
    obs.observe(el)
    return () => { obs.disconnect(); root.style.setProperty("--ojm-avail-bar-h", "0px") }
  }, [variant, visible])

  if (!visible) return null

  const onClick = () => {
    const next = !enabled
    toggle(next)
    clearTimeout(toastTimer.current)
    setToast(next)
    if (next) toastTimer.current = setTimeout(() => setToast(false), 3500)
  }

  const isMap = variant !== "header"
  const live = liveFor(since, now)
  const offAt = clockTime(expiresAt)
  // The header copy also shows on phones away from the maps, squeezed between
  // the logo and the menu — so it shrinks (and drops the van) when tight.
  const size = isMap ? "w-full min-h-[52px] rounded-2xl" : "w-full h-[50px] rounded-[15px]"

  return (
    <div ref={wrapRef} className={`relative min-w-0 ${isMap ? "w-full" : "w-full max-w-[340px]"} ${className}`}>
      <button type="button" onClick={onClick} disabled={saving} aria-pressed={enabled}
        aria-label={enabled ? "Available now — tap to go unavailable" : "Unavailable — tap to go available"}
        className={`${size} flex items-center gap-2.5 px-3 text-left transition-colors disabled:opacity-80 ${
          enabled
            ? "bg-emerald-900 border-2 border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_6px_18px_rgba(2,6,23,0.3)]"
            : "bg-slate-900 border border-slate-700 shadow-[0_6px_18px_rgba(2,6,23,0.3)] hover:border-slate-500"
        }`}>
        <img src={enabled ? "/Van2.png" : "/Van1.png"} alt="" className={`w-[42px] h-[21px] object-contain flex-shrink-0 ${isMap ? "" : "hidden sm:block"}`} />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          {enabled ? (
            <>
              <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
                </span>
                Available now
              </span>
              <span className="inline-flex items-center gap-1 self-start max-w-full overflow-hidden rounded-full bg-slate-950/35 px-1.5 py-px text-[11px] font-semibold text-emerald-100 whitespace-nowrap">
                <Clock className="w-[11px] h-[11px]" />
                {live ? `Live for ${live}` : "Live"}{offAt ? ` · auto-off ${offAt}` : ""}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-slate-50 truncate">You&apos;re unavailable</span>
              <span className="text-[11px] text-slate-300 truncate">{isMap ? "Tap" : "Click"} to go live as a green van</span>
            </>
          )}
        </span>
        <span aria-hidden="true" className={`relative w-[46px] h-[26px] rounded-full flex-shrink-0 transition-colors ${enabled ? "bg-emerald-500" : "bg-slate-600"}`}>
          <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-[left] duration-200 ${enabled ? "left-[23px]" : "left-[3px]"}`} />
        </span>
      </button>

      {toast && (
        <div role="status"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-[210] flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-lg">
          <img src="/Van2.png" alt="" className="w-8 h-4 object-contain" />
          You&apos;re live — customers nearby see your green van
        </div>
      )}
    </div>
  )
}
