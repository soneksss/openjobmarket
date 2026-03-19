"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface JobExpiryBadgeProps {
  expiresAt: string
}

function calcRemaining(expiresAt: string) {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now())
}

export function JobExpiryBadge({ expiresAt }: JobExpiryBadgeProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(expiresAt))

  useEffect(() => {
    const id = setInterval(() => {
      const r = calcRemaining(expiresAt)
      setRemaining(r)
      if (r === 0) clearInterval(id)
    }, 60_000) // update every minute
    return () => clearInterval(id)
  }, [expiresAt])

  if (remaining === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-500 border border-slate-600/50">
        <Clock className="w-2.5 h-2.5" />
        Expired
      </span>
    )
  }

  const days    = Math.floor(remaining / 86_400_000)
  const hours   = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)

  let label: string
  let urgencyClass: string

  if (days > 1) {
    label = `${days}d left`
    urgencyClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
  } else if (days === 1 || hours >= 12) {
    label = `${days > 0 ? `${days}d ` : ""}${hours}h left`
    urgencyClass = "bg-amber-500/10 text-amber-400 border-amber-500/25"
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m left`
    urgencyClass = "bg-orange-500/10 text-orange-400 border-orange-500/25"
  } else {
    label = `${minutes}m left`
    urgencyClass = "bg-red-500/10 text-red-400 border-red-500/25"
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${urgencyClass}`}>
      <Clock className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}
