"use client"

import { useEffect, useRef, useState } from "react"
import { Zap, Info, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useAvailableNow } from "@/contexts/available-now-context"

/**
 * "Available now" — reads/writes the shared AvailableNowContext, so flipping
 * it here (or in the company dashboard's own copy) updates every instance
 * instantly, no refresh needed. Renders nothing for non-tradesperson accounts.
 */
export function AvailableNowToggle({ className = "" }: { className?: string }) {
  const { ready, isCompany, enabled, saving, toggle } = useAvailableNow()
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showInfo) return
    const onClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [showInfo])

  if (!ready || !isCompany) return null

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/95 border border-slate-700/80 shadow-md">
        <Zap className={`w-3.5 h-3.5 ${enabled ? "text-emerald-400" : "text-slate-500"}`} />
        <span className={`text-xs font-semibold whitespace-nowrap ${enabled ? "text-white" : "text-slate-400"}`}>
          Available now
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
            Turn this on to receive urgent job alerts and appear as available on the map.
            It automatically turns off after 24 hours — you'll get a reminder to re-confirm.
          </p>
        </div>
      )}
    </div>
  )
}
