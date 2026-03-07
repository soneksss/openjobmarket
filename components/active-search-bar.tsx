"use client"

import { useRouter } from "next/navigation"
import { Zap, X } from "lucide-react"
import { useActiveSearch } from "@/lib/contexts/active-search-context"

export function ActiveSearchBar() {
  const router = useRouter()
  const { activeSearch, clearActiveSearch } = useActiveSearch()

  if (!activeSearch) return null

  return (
    <div className="sticky top-0 z-40 animate-slide-in-down">
      <div className="relative flex items-center bg-emerald-700/97 backdrop-blur-sm border-b border-emerald-600/50 shadow-md shadow-emerald-900/30">
        {/* Clickable area → navigate back to live tracking */}
        <button
          onClick={() => router.push(`/jobs/${activeSearch.jobId}/live`)}
          className="flex-1 flex items-center gap-3 px-4 pr-12 py-2.5 text-white text-left hover:bg-emerald-600/30 transition-colors"
        >
          {/* Pulsing indicator */}
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight truncate">
              Searching for trades · {activeSearch.jobTitle}
            </p>
            <p className="text-xs text-emerald-100/80 leading-tight">
              {activeSearch.tradesCount > 0
                ? `${activeSearch.tradesCount} responded — tap to view`
                : "Contacting nearby professionals… tap to view"}
            </p>
          </div>

          <Zap className="w-4 h-4 text-emerald-200 flex-shrink-0" />
        </button>

        {/* Dismiss (doesn't cancel the job — just hides the bar) */}
        <button
          onClick={clearActiveSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-emerald-600/60 transition-colors text-emerald-100"
          aria-label="Dismiss search bar"
          title="Dismiss (search continues in background)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
