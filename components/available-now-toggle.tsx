"use client"

import { useEffect, useRef, useState } from "react"
import { Zap, Info, X, MapPin } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useAvailableNow } from "@/contexts/available-now-context"

function formatCountdown(ms: number): string {
  if (ms <= 0) return "resetting…"
  const totalMinutes = Math.round(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * "Available now" — reads/writes the shared AvailableNowContext, so flipping
 * it here (or in the company dashboard's own copy) updates every instance
 * instantly, no refresh needed. Renders nothing for non-tradesperson accounts.
 */
export function AvailableNowToggle({ className = "" }: { className?: string }) {
  const { ready, isCompany, enabled, saving, expiresAt, toggle } = useAvailableNow()
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)
  // Ticks once a minute so the countdown text stays live without a per-second re-render.
  const [, tick] = useState(0)

  useEffect(() => {
    if (!showInfo) return
    const onClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [showInfo])

  useEffect(() => {
    if (!enabled || !expiresAt) return
    const id = setInterval(() => tick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [enabled, expiresAt])

  if (!ready || !isCompany) return null

  const countdownLabel = enabled && expiresAt ? formatCountdown(new Date(expiresAt).getTime() - Date.now()) : null

  return (
    <div className={`relative flex flex-col items-center gap-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/95 border border-slate-700/80 shadow-md">
          <Zap className={`w-3.5 h-3.5 ${enabled ? "text-emerald-400" : "text-slate-500"}`} />
          <span className={`text-xs font-semibold whitespace-nowrap ${enabled ? "text-white" : "text-slate-400"}`}>
            {enabled ? "Available now" : "Not available"}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={toggle}
            disabled={saving}
            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-600"
          />
        </div>
        <button
          onClick={() => setShowInfo(v => !v)}
          aria-label="What does Available now do?"
          className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors flex-shrink-0"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {showInfo && (
          <div ref={infoRef}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 z-[200]">
            <button onClick={() => setShowInfo(false)}
              className="absolute top-2 right-2 text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-xs font-bold text-white pr-4">Available now</p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Turn this on to show you're available for work and share your live location — you'll
              appear as a green van at your current spot on the map and get nearby urgent job alerts.
            </p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              It automatically resets to <span className="text-slate-300 font-medium">Busy at 9:00 AM the next day</span> —
              not 24 hours after you turn it on — so switching it off and back on doesn't push the reset any later.
              We'll send you a push notification then to reconfirm.
            </p>
          </div>
        )}
      </div>

      {enabled && (
        <span className="text-[10px] text-emerald-400 whitespace-nowrap flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5" /> Live location active
        </span>
      )}
      {countdownLabel && (
        <span className="text-[10px] text-slate-500 whitespace-nowrap">Resets in {countdownLabel}</span>
      )}
    </div>
  )
}
