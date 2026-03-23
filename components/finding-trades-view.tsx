"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft, CheckCircle2, MessageCircle, Phone,
  Star, MapPin, Users, Zap, X, Edit, UserPlus,
  PartyPopper, Minimize2, Bell, AlertCircle, Clock, StopCircle, TimerOff, RefreshCw,
} from "lucide-react"
import { createClient } from "@/lib/client"
import { useActiveSearch } from "@/lib/contexts/active-search-context"

const FindingTradesMap = dynamic(() => import("./finding-trades-map"), { ssr: false })

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                               */
/* ─────────────────────────────────────────────────────────────────── */
type Phase =
  | "searching"      // 0–3 s: pulsing dot
  | "sent"           // 3 s+: "Request sent to N trades"
  | "first_accepted" // first trade accepts
  | "expanding"      // no response after 2.5 min → expand
  | "all_responded"  // multiple responses in
  | "no_trades"      // confirmed: nobody available
  | "timed_out"      // 1-hour window expired

type SearchingPhase = Exclude<Phase, "no_trades" | "timed_out">

type TradeStatus = "waiting" | "accepted" | "declined"

interface Trade {
  id: string        // company_profiles.id (profile ID)
  userId: string    // auth user ID — used for messaging and profile URL
  name: string
  businessName?: string
  avatarUrl?: string
  rating: number
  reviewCount: number
  distanceMiles: number
  respondedAt: string
  verified: boolean
  status: TradeStatus
  phone?: string
  message?: string
  addedAt: number
  lat?: number | null
  lng?: number | null
}

interface Job {
  id: string
  title: string
  location: string
  latitude: number | null
  longitude: number | null
  urgency_type: string | null
  search_radius_miles: number | null
  expires_at?: string | null
  job_state?: string | null
}

interface FindingTradesViewProps {
  job: Job
  userId: string
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers (module-level — stable references, no blinking)            */
/* ─────────────────────────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

/* ── Trade card — defined outside component so reference is stable ── */
interface TradeCardProps {
  trade: Trade
  index: number
  elapsed: number
  onMessage: (trade: Trade) => void
  onCall: (trade: Trade) => void
  onConfirm: (trade: Trade) => void
  confirming?: boolean
}

function TradeCard({ trade, index, elapsed, onMessage, onCall, onConfirm, confirming }: TradeCardProps) {
  return (
    <div
      className={`animate-fade-in-up p-3 rounded-2xl border transition-colors duration-300 ${
        trade.status === "accepted"
          ? "bg-emerald-500/12 border-emerald-500/35 shadow-sm shadow-emerald-500/10"
          : trade.status === "declined"
          ? "bg-slate-700/15 border-slate-600/20 opacity-40"
          : "bg-slate-700/35 border-slate-600/30"
      }`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar + name — clickable → tradesperson profile */}
        <a
          href={`/companies/${trade.id}`}
          className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 transition-all duration-500 hover:ring-emerald-400/70 ${
            trade.status === "accepted" ? "ring-emerald-500/50" : "ring-slate-600/40"
          } bg-slate-600`}
        >
          {trade.avatarUrl
            ? <img src={trade.avatarUrl} alt={trade.name} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-slate-200">{trade.name.charAt(0).toUpperCase()}</span>
          }
        </a>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <a
              href={`/companies/${trade.id}`}
              className="text-sm font-semibold text-white truncate hover:text-emerald-300 transition-colors"
            >
              {trade.businessName || trade.name}
            </a>
            {trade.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {trade.rating.toFixed(1)}
              <span className="text-slate-500 ml-0.5">({trade.reviewCount})</span>
            </span>
            {trade.distanceMiles > 0 && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {trade.distanceMiles.toFixed(1)} mi
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {trade.status === "waiting" && (
              <span className="animate-fade-in flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
                </span>
                <span className="text-xs text-yellow-400">
                  Waiting…{" "}
                  <span className="font-mono tracking-tight">{fmt(Math.max(0, elapsed - index * 5))}</span>
                </span>
              </span>
            )}
            {trade.status === "accepted" && (
              <span className="animate-pop-in flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-semibold">Applied — Ready to chat</span>
              </span>
            )}
            {trade.status === "declined" && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-red-400">Declined</span>
              </span>
            )}
          </div>
        </div>
      </div>
      {trade.status === "accepted" && trade.message && (
        <div className="mt-2 px-1">
          <p className="text-xs text-slate-300 bg-slate-700/60 rounded-lg px-2.5 py-2 leading-relaxed">
            &ldquo;{trade.message}&rdquo;
          </p>
        </div>
      )}
      {trade.status === "accepted" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onMessage(trade)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Message
          </button>
          {trade.phone && (
            <button
              onClick={() => onCall(trade)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
          )}
          <button
            onClick={() => onConfirm(trade)}
            disabled={confirming}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {confirming ? "…" : "Confirm"}
          </button>
        </div>
      )}
    </div>
  )
}

function SkeletonCard({ index, elapsed }: { index: number; elapsed: number }) {
  return (
    <div
      className="animate-fade-in-up p-3 rounded-2xl border border-slate-600/25 bg-slate-700/25"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-600/60 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded-full bg-slate-600/60 animate-pulse" style={{ width: `${60 + index * 8}%` }} />
          <div className="h-2.5 rounded-full bg-slate-600/60 animate-pulse w-1/2" />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
          </span>
          <span className="text-xs font-mono text-yellow-400/80">{fmt(Math.max(0, elapsed - index * 6))}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Sound helper — plays when a trade responds on the live search page  */
/* ─────────────────────────────────────────────────────────────────── */
function playTradeResponseSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = (freq: number, start: number, dur: number, vol = 0.6) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = "sine"; o.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime + start)
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.008)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + dur)
    }
    osc(880,    0,    0.18)
    osc(1046.5, 0.18, 0.18)
    osc(1318.5, 0.36, 0.45, 0.7)
    try { navigator.vibrate?.([150, 60, 300]) } catch {}
  } catch {}
}

/* ─────────────────────────────────────────────────────────────────── */
/* Component                                                           */
/* ─────────────────────────────────────────────────────────────────── */
export function FindingTradesView({ job, userId }: FindingTradesViewProps) {
  const router   = useRouter()
  const supabase = createClient()
  const { setActiveSearch, clearActiveSearch } = useActiveSearch()

  const [phase, setPhase]                         = useState<Phase>("searching")
  const [trades, setTrades]                       = useState<Trade[]>([])
  const [notifiedCount, setNotifiedCount]         = useState(0)
  const [elapsed, setElapsed]                     = useState(0)
  const [noRespSecs, setNoRespSecs]               = useState(150)
  const [firstAcceptedName, setFirstAcceptedName] = useState("")
  const [expandSlots, setExpandSlots]             = useState(0)
  const [radiusMiles, setRadiusMiles]             = useState(job.search_radius_miles ?? 5)
  const [isExpanding, setIsExpanding]             = useState(false)
  const [notifyRequested, setNotifyRequested]     = useState(false)
  const [stopped, setStopped]                     = useState(false)
  const [timeLeft, setTimeLeft]                   = useState<number>(() => {
    if (!job.expires_at) return 3600
    const diff = Math.floor((new Date(job.expires_at).getTime() - Date.now()) / 1000)
    return Math.max(0, Math.min(diff, 3600))
  })

  const lat = job.latitude  ?? 51.5074
  const lon = job.longitude ?? -0.1278

  const prevAcceptedRef  = useRef(false)
  const pollFailsRef     = useRef(0)
  const pollIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── check if job is already expired on mount ── */
  useEffect(() => {
    if (!job.expires_at) return
    const remaining = new Date(job.expires_at).getTime() - Date.now()
    if (remaining <= 0) {
      setStopped(true)
      setPhase("timed_out")
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── countdown tick: timeLeft → 0 → timed_out ── */
  useEffect(() => {
    if (stopped || !job.expires_at) return
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStopped(true)
          setPhase("timed_out")
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped])

  /* ── elapsed ticker ── */
  useEffect(() => {
    if (stopped) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [stopped])

  /* ── 3 s: searching → sent ── */
  useEffect(() => {
    if (stopped) return
    const t = setTimeout(() => setPhase((p) => p === "searching" ? "sent" : p), 3000)
    return () => clearTimeout(t)
  }, [stopped])

  /* ── no_trades: been in "sent" for 20 s with 0 notified and no responses ── */
  useEffect(() => {
    if (stopped || phase !== "sent" || notifiedCount !== 0 || trades.length > 0) return
    const t = setTimeout(() => {
      setPhase((p) => p === "sent" ? "no_trades" : p)
    }, 20000)
    return () => clearTimeout(t)
  }, [stopped, phase, notifiedCount, trades.length])

  /* ── no_trades: expansion animation done, still 0 trade responses ── */
  useEffect(() => {
    if (phase !== "expanding" || isExpanding || trades.length !== 0) return
    const t = setTimeout(() => setPhase("no_trades"), 2000)
    return () => clearTimeout(t)
  }, [phase, isExpanding, trades.length])

  /* ── no-response countdown → expanding (only if someone was notified) ── */
  useEffect(() => {
    if (stopped || trades.length > 0) return
    if (notifiedCount === 0) return
    if (["expanding", "first_accepted", "all_responded", "no_trades"].includes(phase)) return

    const t = setInterval(() => {
      setNoRespSecs((s) => {
        if (s <= 1) { triggerExpand(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped, trades.length, phase, notifiedCount])

  /* ── detect first accepted ── */
  useEffect(() => {
    const hasAccepted = trades.some((t) => t.status === "accepted")
    if (hasAccepted && !prevAcceptedRef.current) {
      prevAcceptedRef.current = true
      const first = trades.find((t) => t.status === "accepted")
      setFirstAcceptedName(first?.businessName || first?.name || "A tradesperson")
      setPhase("first_accepted")
      if (trades.filter((t) => t.status === "accepted").length > 1) setPhase("all_responded")
    }
  }, [trades])

  const triggerExpand = async () => {
    setPhase("expanding")
    setIsExpanding(true)
    setExpandSlots(2)
    try {
      const newRadius = Math.min(radiusMiles * 2, 25)
      await supabase.from("jobs").update({
        search_radius_miles: newRadius,
        search_state: "active_search",
      }).eq("id", job.id)
      setRadiusMiles(newRadius)
    } catch {}
    setTimeout(() => setIsExpanding(false), 6000)
  }

  /* ── actions ── */
  const handleMinimize = () => {
    setActiveSearch({
      jobId:         job.id,
      jobTitle:      job.title,
      tradesCount:   trades.length,
      notifiedCount,
      phase,
      startedAt:     Date.now() - elapsed * 1000,
      userId,
    })
    router.push("/")
  }

  const handleStopSearch = async () => {
    setStopped(true)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    try {
      await supabase.from("jobs").update({
        matching_status: "stopped",
        search_state: null,
      }).eq("id", job.id)
    } catch {}
  }

  const handleNotifyMe = async () => {
    setNotifyRequested(true)
    try {
      await supabase.from("jobs").update({ notify_when_available: true }).eq("id", job.id)
    } catch {}
    setTimeout(() => router.push("/"), 1500)
  }

  const handleCancelRequest = async () => {
    try { await supabase.from("jobs").update({ is_active: false, matching_status: "cancelled" }).eq("id", job.id) } catch {}
    clearActiveSearch()
    router.push("/dashboard/homeowner")
  }

  const handleExtendSearch = async () => {
    const newExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    try {
      await supabase.from("jobs").update({ expires_at: newExpiry, search_state: "active_search" }).eq("id", job.id)
    } catch {}
    setTimeLeft(3600)
    setStopped(false)
    setPhase("sent")
  }

  const handleLeaveJobLive = async () => {
    try {
      await supabase.from("jobs").update({ search_state: "completed", is_active: true }).eq("id", job.id)
    } catch {}
    clearActiveSearch()
    router.push("/dashboard/homeowner")
  }

  const handleContactMore = () => {
    if (phase !== "expanding") triggerExpand()
  }

  /* ── poll for responses ── */
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}/urgent-responses`, { credentials: "include" })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        }
        return
      }
      pollFailsRef.current = 0
      const data = await res.json()
      if (data.notifiedCount) setNotifiedCount(data.notifiedCount)
      if (!data.notifiedCount && data.responses?.length > 0) setNotifiedCount(data.responses.length)
      if (data.jobState) setDbJobState(data.jobState)
      if (data.responses?.length > 0) {
        const now = Date.now()
        setTrades((prev) => {
          const incoming: Trade[] = data.responses.map((r: any, i: number): Trade => ({
            id:            r.id,
            userId:        r.user_id,
            name:          r.name,
            businessName:  r.business_name,
            avatarUrl:     r.avatar_url,
            rating:        r.rating ?? 4.5,
            reviewCount:   r.review_count ?? 0,
            distanceMiles: r.distance_miles ?? 0,
            respondedAt:   r.response_time ?? "Just now",
            verified:      r.verified ?? false,
            status:        "accepted",
            phone:         r.phone,
            message:       r.message ?? undefined,
            addedAt:       now + i * 150,
            lat:           r.lat ?? null,
            lng:           r.lng ?? null,
          }))
          const ids = new Set(prev.map((t) => t.id))
          const newOnes = incoming.filter((t) => !ids.has(t.id))
          if (newOnes.length > 0) playTradeResponseSound()
          return [...prev, ...newOnes]
        })
        if (data.responses.length > 1) setPhase("all_responded")
      }
    } catch {
      pollFailsRef.current++
      if (pollFailsRef.current >= 5) {
        console.warn("[FindingTradesView] Poll failed 5 times in a row — stopping.")
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }
    }
  }, [job.id])

  useEffect(() => {
    if (stopped) return
    poll()
    pollIntervalRef.current = setInterval(poll, 5000)
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [poll, stopped])

  useEffect(() => {
    if (stopped) return
    const channel = supabase
      .channel(`finding-trades-${job.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "job_applications", filter: `job_id=eq.${job.id}`,
      }, poll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [job.id, supabase, poll, stopped])

  const [dbJobState, setDbJobState] = useState<string | null>(job.job_state ?? null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // Get or create conversation then open the dark /messages/:id view
  const openConversation = async (trade: Trade) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ with_user_id: trade.userId }),
      })
      const body = await res.json().catch(() => ({}))
      router.push(body.conversationId ? `/messages/${body.conversationId}?job=${job.id}` : `/messages`)
    } catch {
      router.push(`/messages`)
    }
  }

  const contact = (trade: Trade, method: "call" | "message") => {
    if (method === "message") openConversation(trade)
    if (method === "call" && trade.phone) window.location.href = `tel:${trade.phone}`
  }

  const handleConfirm = async (trade: Trade) => {
    if (confirmingId) return
    setConfirmingId(trade.id)
    try {
      const res = await fetch(`/api/jobs/${job.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ company_id: trade.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok || res.status === 409) {
        // Stop polling + clear the minimised search bar
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        clearActiveSearch()
        const convId = body.conversationId
        router.push(convId ? `/messages/${convId}?job=${job.id}` : `/messages`)
      }
    } catch {
      clearActiveSearch()
      router.push(`/messages`)
    } finally {
      setConfirmingId(null)
    }
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* TIMED OUT SCREEN                                                    */
  /* ─────────────────────────────────────────────────────────────────── */
  if (phase === "timed_out") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/60 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
              <TimerOff className="w-4 h-4 text-red-400" />
              Search Timed Out
            </p>
            <p className="text-xs text-slate-400">{job.title} · {radiusMiles} mi radius</p>
          </div>
          <div className="w-16" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center overflow-y-auto">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-6 animate-pop-in">
            <TimerOff className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            1-hour search window ended
          </h2>
          {trades.length > 0 ? (
            <p className="text-sm text-slate-400 mb-8 max-w-xs animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              {trades.length} tradesperson{trades.length !== 1 ? "s have" : " has"} already applied. Choose below or extend your search.
            </p>
          ) : (
            <p className="text-sm text-slate-400 mb-8 max-w-xs animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              No one responded in time. You can extend the search or leave your job live to receive replies later.
            </p>
          )}
          <div className="w-full max-w-sm space-y-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <button
              onClick={handleExtendSearch}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500 hover:bg-red-400 text-white transition-all duration-200 active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Extend Search +1 Hour</p>
                <p className="text-xs text-red-100/80 font-normal mt-0.5">Keep notifying nearby tradespeople</p>
              </div>
            </button>

            <button
              onClick={handleLeaveJobLive}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-600/60 transition-all duration-200 active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Leave Job Live</p>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Trades can still find and apply to your job</p>
              </div>
            </button>

            <button
              onClick={handleCancelRequest}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 hover:border-red-500/30 text-white transition-all duration-200 active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-700/80 flex items-center justify-center flex-shrink-0">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight text-red-300">Cancel Request</p>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Remove the job completely</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* NO TRADES SCREEN                                                    */
  /* ─────────────────────────────────────────────────────────────────── */
  if (phase === "no_trades" && !stopped) {
    const atMaxRadius = radiusMiles >= 25

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/60 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              No Trades Available
            </p>
            <p className="text-xs text-slate-400">{job.title} · searched {radiusMiles} mi</p>
          </div>
          <div className="w-16" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center overflow-y-auto">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 animate-pop-in">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            No {job.title.toLowerCase()}s available nearby
          </h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xs animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            You can still post your job and receive replies when trades become available in your area.
          </p>
          <div className="w-full max-w-sm space-y-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white transition-all duration-200 active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Post Job &amp; Wait for Replies</p>
                <p className="text-xs text-orange-100/80 font-normal mt-0.5">Your job stays live — trades will find you</p>
              </div>
            </button>

            {!atMaxRadius ? (
              <button
                onClick={() => triggerExpand()}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-600/60 transition-all duration-200 active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Expand Search Radius</p>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">Look up to {Math.min(radiusMiles * 2, 25)} miles from your location</p>
                </div>
              </button>
            ) : (
              <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700/40 opacity-50 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-500 text-sm leading-tight">Already at maximum radius</p>
                  <p className="text-xs text-slate-600 font-normal mt-0.5">Searching up to 25 miles</p>
                </div>
              </div>
            )}

            <button
              onClick={handleNotifyMe}
              disabled={notifyRequested}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 active:scale-[0.98] text-left ${
                notifyRequested
                  ? "bg-emerald-500/10 border border-emerald-500/30 cursor-default"
                  : "bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600/60"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notifyRequested ? "bg-emerald-500/20" : "bg-slate-700/80"}`}>
                <Bell className={`w-5 h-5 ${notifyRequested ? "text-emerald-400" : "text-slate-300"}`} />
              </div>
              <div>
                {notifyRequested ? (
                  <>
                    <p className="font-semibold text-emerald-400 text-sm leading-tight animate-pop-in">✓ We'll notify you</p>
                    <p className="text-xs text-emerald-400/70 font-normal mt-0.5">Alert when a trade becomes available</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-white text-sm leading-tight">Notify me when available</p>
                    <p className="text-xs text-slate-400 font-normal mt-0.5">Get a notification when a trade opens up</p>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* STATUS BANNER CONFIG                                                */
  /* ─────────────────────────────────────────────────────────────────── */
  const stoppedBanner = {
    bg: "bg-slate-700/60 border-slate-600/40",
    icon: <StopCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />,
    title: <span className="text-sm font-semibold text-slate-200">Search stopped — {trades.length > 0 ? `${trades.length} applicant${trades.length !== 1 ? "s" : ""} found` : "no applicants yet"}</span>,
    sub:   <span className="text-xs text-slate-400/80">Message or call any tradesperson below.</span>,
  }

  const banners: Record<SearchingPhase, {
    bg: string; icon: React.ReactNode; title: React.ReactNode; sub: React.ReactNode; right?: React.ReactNode
  }> = {
    searching: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      icon: (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      ),
      title: <span className="text-sm font-semibold text-emerald-300">Searching for available tradespeople nearby…</span>,
      sub:   <span className="text-xs text-emerald-400/80">Contacting the closest tradespeople to you.</span>,
      right: <span className="text-xs text-emerald-400/60 flex-shrink-0 hidden sm:block">Replies in 2–5 min</span>,
    },
    sent: {
      bg: elapsed < 150
        ? "bg-blue-500/10 border-blue-500/20"
        : "bg-indigo-500/10 border-indigo-500/20",
      icon: elapsed < 150
        ? <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
        : <Bell className="w-4 h-4 text-indigo-400 flex-shrink-0 animate-pulse" />,
      title: elapsed < 30 ? (
        <span className="text-sm font-semibold text-blue-300">
          We found {notifiedCount > 0 ? notifiedCount : "several"} tradespeople nearby and notified them.
        </span>
      ) : elapsed < 90 ? (
        <span className="text-sm font-semibold text-blue-300">Still searching… notifying more tradespeople.</span>
      ) : elapsed < 150 ? (
        <span className="text-sm font-semibold text-blue-300">Expanding the search radius to reach more trades.</span>
      ) : (
        <span className="text-sm font-semibold text-indigo-300">You can minimize — we'll notify you when someone responds.</span>
      ),
      sub: elapsed < 30 ? (
        <span className="text-xs text-blue-400/80">Waiting for their responses…</span>
      ) : elapsed < 90 ? (
        <span className="text-xs text-blue-400/80">Replies usually arrive within 2–5 minutes.</span>
      ) : elapsed < 150 ? (
        <span className="text-xs text-blue-400/80">Hang tight — more tradespeople are being contacted.</span>
      ) : (
        <span className="text-xs text-indigo-400/80">Tap "Minimize" — your search continues in the background.</span>
      ),
    },
    first_accepted: {
      bg: "bg-emerald-500/15 border-emerald-500/30",
      icon: <PartyPopper className="w-4 h-4 text-emerald-300 flex-shrink-0" />,
      title: <span className="text-sm font-semibold text-emerald-200">{firstAcceptedName} applied — message them or wait for more.</span>,
      sub:   <span className="text-xs text-emerald-400/80">See their profile below. Search is still running.</span>,
    },
    expanding: {
      bg: "bg-amber-500/10 border-amber-500/20",
      icon: (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
        </span>
      ),
      title: <span className="text-sm font-semibold text-amber-300">Expanding search radius…</span>,
      sub:   <span className="text-xs text-amber-400/80">Looking further to find available trades.</span>,
    },
    all_responded: {
      bg: "bg-emerald-500/15 border-emerald-500/30",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
      title: <span className="text-sm font-semibold text-emerald-200">{trades.length} tradesperson{trades.length !== 1 ? "s" : ""} applied — choose the best fit.</span>,
      sub:   <span className="text-xs text-emerald-400/80">Message or call any of them below.</span>,
    },
  }

  // When DB state says tradespeople have applied, show a "Respond soon!" nudge
  // regardless of the local phase — homeowner should see they have applicants.
  const pendingHomeownerBanner = {
    bg: "bg-amber-500/15 border-amber-500/30",
    icon: <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />,
    title: <span className="text-sm font-semibold text-amber-200">Trades are waiting for you — respond soon!</span>,
    sub:   <span className="text-xs text-amber-400/80">Review the applicants below and choose one to confirm.</span>,
  }

  const activeBanner =
    stopped                              ? stoppedBanner :
    dbJobState === "pending_homeowner" && trades.length > 0 ? pendingHomeownerBanner :
    banners[phase as SearchingPhase]

  /* ─────────────────────────────────────────────────────────────────── */
  /* MAIN RENDER                                                         */
  /* ─────────────────────────────────────────────────────────────────── */
  const skeletonCount = stopped ? 0 : Math.max(0, 3 + expandSlots - trades.length)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-hidden">

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/60 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            {stopped ? "Search Complete" : "Finding Available Trades"}
          </p>
          <p className="text-xs text-slate-400">{job.title} · {radiusMiles} mi radius</p>
          {!stopped && job.expires_at && (
            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
              timeLeft < 300
                ? "bg-red-500/20 text-red-300 animate-pulse"
                : timeLeft < 600
                ? "bg-orange-500/15 text-orange-300"
                : "bg-slate-700/60 text-slate-400"
            }`}>
              <Clock className="w-2.5 h-2.5" />
              {fmt(timeLeft)} left
            </div>
          )}
        </div>

        <button
          onClick={handleMinimize}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors"
          title="Minimize — search continues in background"
        >
          <Minimize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Minimize</span>
        </button>
      </div>

      {/* ── STATUS BANNER ───────────────────────────────────────── */}
      <div
        key={stopped ? "stopped" : phase}
        className={`animate-fade-in flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0 transition-colors duration-500 ${activeBanner.bg}`}
      >
        {activeBanner.icon}
        <div className="flex-1 min-w-0">
          <div>{activeBanner.title}</div>
          <div>{activeBanner.sub}</div>
        </div>
        {/* Stop search button — only visible while actively searching */}
        {!stopped && (
          <button
            onClick={handleStopSearch}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-400 border border-slate-600 hover:border-red-500/50 px-2.5 py-1 rounded-lg transition-colors"
            title="Stop the search and keep current results"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}
        {!stopped && activeBanner.right}
      </div>

      {/* ── RADIUS SELECTOR ─────────────────────────────────────── */}
      {!stopped && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border-b border-slate-700/40 flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-[11px] text-slate-500 flex-shrink-0">Radius:</span>
          <div className="flex gap-1">
            {[5, 10, 15, 20, 25].map((mi) => (
              <button
                key={mi}
                onClick={async () => {
                  if (mi === radiusMiles) return
                  setRadiusMiles(mi)
                  try {
                    await supabase.from("jobs").update({ search_radius_miles: mi }).eq("id", job.id)
                  } catch {}
                }}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                  mi === radiusMiles
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700/80 text-slate-400 hover:bg-slate-600 hover:text-white"
                }`}
              >
                {mi}mi
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* MAP */}
        <div className="h-[30vh] md:h-auto md:flex-1 relative flex-shrink-0 overflow-hidden">
          <FindingTradesMap
            lat={lat}
            lon={lon}
            searchRadiusMiles={radiusMiles}
            isExpanding={isExpanding && !stopped}
            trades={trades.map((t) => ({
              id: t.id,
              name: t.businessName || t.name,
              distanceMiles: t.distanceMiles,
              status: t.status,
              lat: t.lat,
              lng: t.lng,
            }))}
          />
        </div>

        {/* TRADE PANEL */}
        <div className="
          flex-1 md:flex-none md:w-80
          overflow-y-auto
          bg-slate-800/98 md:bg-slate-800
          border-t md:border-t-0 md:border-l border-slate-700/60
          rounded-t-2xl md:rounded-none
        ">
          <div className="flex justify-center pt-2 pb-1 md:hidden">
            <div className="w-8 h-1 rounded-full bg-slate-600" />
          </div>
          <div className="px-4 pb-4 pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-white">
                {stopped ? "Applicants" : "Contacted Trades"}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {stopped
                  ? (trades.length > 0 ? `${trades.length} found` : "None yet")
                  : (notifiedCount ? `${notifiedCount} alerted` : "Searching…")}
              </span>
            </div>

            {trades.map((t, i) => (
              <TradeCard
                key={t.id}
                trade={t}
                index={i}
                elapsed={elapsed}
                onMessage={(trade) => contact(trade, "message")}
                onCall={(trade) => contact(trade, "call")}
                onConfirm={handleConfirm}
                confirming={confirmingId === t.id}
              />
            ))}

            {skeletonCount > 0 && Array.from({ length: skeletonCount }, (_, i) => (
              <SkeletonCard key={`sk-${i}`} index={i} elapsed={elapsed} />
            ))}

            {trades.length === 0 && stopped && (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No one applied before the search stopped.</p>
                <p className="text-xs mt-1">Try posting a flexible job to reach more trades.</p>
              </div>
            )}

            {phase === "expanding" && !stopped && (
              <p className="animate-fade-in text-xs text-center text-amber-400/70 pt-1">
                Adding more tradespeople from a wider area…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ───────────────────────────────────── */}
      <div className="flex items-center bg-slate-800/98 border-t border-slate-700/60 flex-shrink-0 px-3 py-2 gap-2">
        {stopped ? (
          <>
            <button
              onClick={() => router.push("/dashboard/homeowner")}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-center min-w-0 flex-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-medium leading-tight">Dashboard</span>
            </button>
            <div className="w-px h-8 bg-slate-700/60" />
            <button
              onClick={() => router.push(`/dashboard/homeowner/jobs/${job.id}`)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all text-center min-w-0 flex-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-medium leading-tight">View Job</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleCancelRequest}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-center min-w-0 flex-1"
            >
              <X className="w-4 h-4" />
              <span className="text-[10px] font-medium leading-tight">Cancel Request</span>
            </button>

            <div className="w-px h-8 bg-slate-700/60" />

            <button
              onClick={handleContactMore}
              disabled={phase === "expanding"}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-center min-w-0 flex-1"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-[10px] font-medium leading-tight">Contact More</span>
            </button>

            <div className="w-px h-8 bg-slate-700/60" />

            <button
              onClick={() => router.push("/dashboard")}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-center min-w-0 flex-1"
            >
              <Edit className="w-4 h-4" />
              <span className="text-[10px] font-medium leading-tight">Edit Job</span>
            </button>
          </>
        )}
      </div>

    </div>
  )
}
