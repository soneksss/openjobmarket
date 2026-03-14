"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Zap, X, CheckCircle2, Bell, Users, ChevronRight } from "lucide-react"
import { useActiveSearch } from "@/lib/contexts/active-search-context"
import { createClient } from "@/lib/client"

export function ActiveSearchBar() {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { activeSearch, setActiveSearch, clearActiveSearch } = useActiveSearch()

  const [notifiedCount, setNotifiedCount] = useState(activeSearch?.notifiedCount ?? 0)
  const [tradesCount,   setTradesCount]   = useState(activeSearch?.tradesCount   ?? 0)
  const [elapsed,       setElapsed]       = useState(0)
  const [cancelling,    setCancelling]    = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── hide on the live page itself (full UI there) ── */
  const isOnLivePage = !!pathname?.match(/^\/jobs\/[0-9a-f-]{36}\/live/)
  if (!activeSearch || isOnLivePage) return null

  // ── elapsed ticker (runs from startedAt stored in context) ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const tick = () =>
      setElapsed(Math.floor((Date.now() - activeSearch.startedAt) / 1000))
    tick()
    const t = setInterval(tick, 5000)
    return () => clearInterval(t)
  }, [activeSearch.startedAt])

  /* ── poll for live counts every 10 s ── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const poll = useCallback(async () => {
    if (!activeSearch) return
    try {
      const res = await fetch(`/api/jobs/${activeSearch.jobId}/urgent-responses`, {
        credentials: "include",
      })
      if (!res.ok) return
      const data = await res.json()
      const nc = data.notifiedCount ?? 0
      const tc = (data.responses ?? []).length
      setNotifiedCount(nc)
      setTradesCount(tc)
      // Persist updated counts so they survive the next page load
      setActiveSearch({ ...activeSearch, notifiedCount: nc, tradesCount: tc })
    } catch {}
  }, [activeSearch?.jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, 10_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  /* ── Cancel search: deactivate job in DB + clear context ── */
  const handleCancel = async () => {
    if (cancelling) return
    setCancelling(true)
    try {
      await supabase
        .from("jobs")
        .update({ is_active: false, matching_status: "cancelled" })
        .eq("id", activeSearch.jobId)
    } catch {}
    clearActiveSearch()
    router.push("/dashboard/homeowner")
  }

  /* ── Progression message based on elapsed seconds ── */
  const message =
    tradesCount > 0
      ? `${tradesCount} tradesperson${tradesCount !== 1 ? "s" : ""} responded — tap to view`
      : notifiedCount > 0
        ? elapsed < 90
          ? `We notified ${notifiedCount} tradespeople — waiting for their responses…`
          : elapsed < 180
          ? `Still searching… expanding radius to reach more trades.`
          : `Search in progress — we'll notify you when someone responds.`
        : elapsed < 30
          ? "Searching for available tradespeople nearby…"
          : elapsed < 90
          ? "Still searching… contacting more tradespeople."
          : "Search in progress — tap to view live updates."

  const hasResponse = tradesCount > 0

  return (
    <div
      className={`sticky top-0 z-40 w-full transition-colors duration-500 ${
        hasResponse
          ? "bg-emerald-700 border-b border-emerald-600/60"
          : "bg-slate-800 border-b border-slate-700/60"
      }`}
    >
      {/* Tap area → live page */}
      <button
        onClick={() => router.push(`/jobs/${activeSearch.jobId}/live`)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-110 transition-all"
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasResponse ? "bg-emerald-300" : "bg-orange-400"}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${hasResponse ? "bg-white" : "bg-orange-400"}`} />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {activeSearch.jobTitle}
          </p>
          <p className={`text-xs leading-tight mt-0.5 truncate ${hasResponse ? "text-emerald-100" : "text-slate-400"}`}>
            {message}
          </p>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {notifiedCount > 0 && (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              hasResponse ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
            }`}>
              <Users className="w-3 h-3" />
              {notifiedCount}
            </span>
          )}
          <ChevronRight className={`w-4 h-4 ${hasResponse ? "text-emerald-200" : "text-slate-500"}`} />
        </div>
      </button>

      {/* Cancel — separate tap target below the main row */}
      <div className="flex items-center justify-between px-4 pb-2 -mt-1">
        <span className="text-[11px] text-slate-500">
          {elapsed > 0 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed` : "Just started"}
        </span>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          <X className="w-3 h-3" />
          {cancelling ? "Cancelling…" : "Cancel search"}
        </button>
      </div>
    </div>
  )
}
