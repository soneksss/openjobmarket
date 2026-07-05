"use client"

import { Search } from "lucide-react"

type Props = {
  loading: boolean
  label?: string | null
  extraCount?: number
  count: number
  countSuffix?: string
  accentColor?: "emerald" | "orange"
  onClick: () => void
}

export function MapSearchBar({
  loading,
  label,
  extraCount = 0,
  count,
  countSuffix = "nearby",
  accentColor = "emerald",
  onClick,
}: Props) {
  const plusColor    = accentColor === "orange" ? "text-orange-400" : "text-emerald-400"
  const activeBorder = accentColor === "orange" ? "active:border-orange-500/60" : "active:border-emerald-500/60"

  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center bg-slate-800/95 border border-slate-600 rounded-full shadow-lg hover:border-slate-400 hover:bg-slate-700/95 ${activeBorder} transition-colors overflow-hidden min-w-0`}>
      {/* LEFT — icon + label */}
      <div className="flex items-center gap-2 flex-1 px-3.5 py-2.5 min-w-0">
        <Search className="w-4 h-4 text-slate-300 flex-shrink-0" />
        {loading
          ? <span className="text-xs text-slate-300 truncate">Searching…</span>
          : label
            ? <span className="flex-1 text-xs text-white font-medium truncate">
                {label}
                {extraCount > 0 && <span className={`ml-1 font-semibold ${plusColor}`}>+{extraCount}</span>}
              </span>
            : <span className="flex-1 text-xs text-slate-300 truncate">Search trade or postcode…</span>}
      </div>
      {/* Divider */}
      <div className="w-px h-5 bg-slate-600 flex-shrink-0" />
      {/* RIGHT — count */}
      <div className="flex-shrink-0 px-3.5 py-2.5 text-xs font-medium text-slate-200 whitespace-nowrap">
        {loading ? "…" : `${count} ${countSuffix}`}
      </div>
    </button>
  )
}
