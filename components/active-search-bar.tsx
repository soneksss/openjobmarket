"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Zap, X, Users, ChevronRight, Clock } from "lucide-react"
import { useActiveSearch } from "@/lib/contexts/active-search-context"
import { createClient } from "@/lib/client"

interface ActiveSearchBarProps {
  userType?: string | null
  userId?: string | null
}

export function ActiveSearchBar({ userType, userId }: ActiveSearchBarProps = {}) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { activeSearch, setActiveSearch, clearActiveSearch } = useActiveSearch()

  // ── All hooks must run unconditionally at top level ─────────────────
  const [notifiedCount, setNotifiedCount] = useState(activeSearch?.notifiedCount ?? 0)
  const [tradesCount,   setTradesCount]   = useState(activeSearch?.tradesCount   ?? 0)
  const [elapsed,       setElapsed]       = useState(0)
  const [cancelling,    setCancelling]    = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync counts from context when activeSearch changes (e.g. after page reload)
  useEffect(() => {
    if (!activeSearch) return
    setNotifiedCount(activeSearch.notifiedCount ?? 0)
    setTradesCount(activeSearch.tradesCount ?? 0)
  }, [activeSearch?.jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Elapsed ticker — recomputes from startedAt every 5 s
  useEffect(() => {
    if (!activeSearch) return
    const tick = () =>
      setElapsed(Math.floor((Date.now() - activeSearch.startedAt) / 1000))
    tick()
    const t = setInterval(tick, 5000)
    return () => clearInterval(t)
  }, [activeSearch?.startedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for live notifiedCount + tradesCount every 10 s
  // Skip polling on the live page — FindingTradesView already polls every 5 s there
  const isOnLivePage = !!pathname?.match(/^\/jobs\/[0-9a-f-]{36}\/live/)
  const poll = useCallback(async () => {
    if (!activeSearch || isOnLivePage) return
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
      setActiveSearch({ ...activeSearch, notifiedCount: nc, tradesCount: tc })
    } catch {}
  }, [activeSearch?.jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeSearch) return
    poll()
    pollRef.current = setInterval(poll, 10_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early return AFTER all hooks ────────────────────────────────────
  // Only homeowners should see the active search bar
  if (userType === "company") return null
  // Clear stale localStorage if the stored search belongs to a different user
  if (activeSearch && userId && activeSearch.userId && activeSearch.userId !== userId) {
    clearActiveSearch()
    return null
  }
  if (!activeSearch || isOnLivePage) return null

  // ── Cancel: deactivate job in DB + clear context ─────────────────────
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

  // ── Progression message ───────────────────────────────────────────────
  const hasResponse = tradesCount > 0
  const message =
    hasResponse
      ? `${tradesCount} tradesperson${tradesCount !== 1 ? "s" : ""} responded — tap to view`
      : notifiedCount > 0
        ? elapsed < 90
          ? `We notified ${notifiedCount} tradespeople — waiting for their responses…`
          : elapsed < 180
          ? "Still searching… expanding radius to reach more trades."
          : "Search in progress — we'll notify you when someone responds."
        : elapsed < 30
          ? "Searching for available tradespeople nearby…"
          : elapsed < 90
          ? "Still searching… contacting more tradespeople."
          : "Search in progress — tap to view live updates."

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
          <p className={`text-xs font-medium leading-tight mt-0.5 truncate ${hasResponse ? "text-emerald-100" : "text-slate-200"}`}>
            {message}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {notifiedCount > 0 && (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              hasResponse ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-300"
            }`}>
              <Users className="w-3 h-3" />
              {notifiedCount}
            </span>
          )}
          <ChevronRight className={`w-4 h-4 ${hasResponse ? "text-emerald-200" : "text-slate-300"}`} />
        </div>
      </button>

      {/* Bottom row: elapsed + cancel */}
      <div className="flex items-center justify-between px-4 pb-2.5 -mt-0.5">
        <span className="flex items-center gap-1 text-xs font-medium text-slate-300">
          <Clock className="w-3 h-3 text-slate-400" />
          {elapsed > 0
            ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed`
            : "Just started"}
        </span>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {cancelling ? "Cancelling…" : "Cancel search"}
        </button>
      </div>
    </div>
  )
}
