"use client"

import { useEffect, useState } from "react"
import { Zap, Clock } from "lucide-react"

interface JobCountdownTimerProps {
  expiresAt: string   // ISO timestamp
  totalMs?: number    // total window in ms — used to compute % remaining (default 30 min)
}

function calcRemaining(expiresAt: string) {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now())
}

function fmt(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return { m, s, display: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` }
}

export function JobCountdownTimer({
  expiresAt,
  totalMs = 30 * 60 * 1000,
}: JobCountdownTimerProps) {
  // null = not yet mounted (avoids SSR/client Date.now() mismatch)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    // Set real value immediately after mount, then tick every second
    setRemaining(calcRemaining(expiresAt))
    const id = setInterval(() => {
      const r = calcRemaining(expiresAt)
      setRemaining(r)
      if (r === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  // Render nothing until mounted (server output stays empty → no hydration mismatch)
  if (remaining === null) return null

  const expired = remaining === 0
  const pct = Math.min(100, Math.max(0, (remaining / totalMs) * 100))
  const { m, s, display } = fmt(remaining)

  // Colour shifts: green → amber → red as time runs out
  const isUrgent  = pct < 25   // < 7.5 min
  const isWarning = pct < 50   // < 15 min

  const ringColour  = isUrgent ? "stroke-red-500"    : isWarning ? "stroke-amber-400"    : "stroke-orange-500"
  const textColour  = isUrgent ? "text-red-400"      : isWarning ? "text-amber-400"      : "text-orange-400"
  const bgColour    = isUrgent ? "bg-red-500/10 border-red-500/30"
                    : isWarning ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-orange-500/10 border-orange-500/30"
  const labelColour = isUrgent ? "text-red-300"      : isWarning ? "text-amber-300"      : "text-orange-300"

  // SVG ring params
  const r  = 38
  const cx = 44
  const circ = 2 * Math.PI * r

  return (
    <div className={`rounded-xl border px-4 py-3 ${bgColour}`}>
      <div className="flex items-center gap-4">
        {/* SVG ring + digital clock */}
        <div className="relative flex-shrink-0 w-[88px] h-[88px]">
          <svg width="88" height="88" className="-rotate-90">
            {/* Track */}
            <circle
              cx={cx} cy={cx} r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              className="text-white/10"
            />
            {/* Progress arc */}
            <circle
              cx={cx} cy={cx} r={r}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={expired ? circ : circ * (1 - pct / 100)}
              className={`${ringColour} transition-all duration-1000`}
            />
          </svg>
          {/* Digital time centred inside ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {expired ? (
              <span className="text-xs font-bold text-slate-400 leading-none">ENDED</span>
            ) : (
              <>
                <span className={`text-lg font-bold leading-none tabular-nums ${textColour}`}>
                  {display}
                </span>
                <span className="text-[10px] text-slate-500 leading-none mt-0.5">left</span>
              </>
            )}
          </div>
        </div>

        {/* Text info */}
        <div className="flex-1 min-w-0">
          {expired ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Clock className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-400">Search window closed</span>
              </div>
              <p className="text-xs text-slate-500">
                The 30-minute urgent window has ended.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Zap className={`h-3.5 w-3.5 flex-shrink-0 fill-current ${textColour}`} />
                <span className={`text-sm font-semibold ${labelColour}`}>Urgent — live now</span>
              </div>
              <p className="text-xs text-slate-400">
                {m > 0
                  ? `Homeowner needs a tradesperson in the next ${m} min`
                  : `Less than a minute left — respond now!`}
              </p>
              {isUrgent && (
                <p className={`text-xs font-semibold mt-1 ${textColour}`}>
                  ⚡ Act fast — almost out of time!
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Linear progress bar underneath */}
      {!expired && (
        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUrgent ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-orange-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
