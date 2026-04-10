"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft, CheckCircle2, MessageCircle, Phone,
  Star, MapPin, Users, Zap, X, Edit, UserPlus,
  PartyPopper, Minimize2, Bell, AlertCircle, Clock, StopCircle, TimerOff, RefreshCw, Eye,
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
  | "background"     // no trades free; keep screen live, 60-min background monitor
  | "timed_out"      // 1-hour window expired

type SearchingPhase = Exclude<Phase, "timed_out">

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

interface AlertedTrade {
  id: string          // company_profiles.id
  userId: string
  name: string
  avatarUrl?: string | null
  viewedAt?: string | null   // set = "viewing" state; null = "alerted" state
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

/* ── Similar-trades lookup — adjacent skill categories for fallback ── */
const SIMILAR_TRADES: Record<string, string[]> = {
  electrician:  ["handyman", "solar installer", "smart home installer"],
  plumber:      ["heating engineer", "bathroom fitter", "drain specialist"],
  carpenter:    ["joiner", "handyman", "general builder"],
  painter:      ["decorator", "plasterer", "handyman"],
  roofer:       ["loft converter", "general builder", "guttering specialist"],
  landscaper:   ["groundworker", "fence installer", "patio layer"],
  cleaner:      ["end of tenancy cleaner", "carpet cleaner", "window cleaner"],
  locksmith:    ["security installer", "handyman"],
  tiler:        ["flooring specialist", "plasterer", "handyman"],
  decorator:    ["painter", "plasterer", "handyman"],
}

function getSimilarTrades(jobTitle: string): string[] {
  const lower = jobTitle.toLowerCase().replace(/s$/, "")
  return SIMILAR_TRADES[lower] ?? []
}

/* ── CheckingCard — "Checking nearby availability…" skeleton for background phase ── */
function CheckingCard({ index }: { index: number }) {
  return (
    <div
      className="animate-fade-in-up p-3 rounded-2xl border border-slate-600/20 bg-slate-700/15"
      style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-700/60 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-600/20">
          <RefreshCw className="w-4 h-4 text-slate-500" style={{ animation: "spin 3s linear infinite" }} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-2.5 rounded-full bg-slate-700/60 animate-pulse" style={{ width: `${55 + index * 10}%` }} />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-50" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500" />
            </span>
            <span className="text-[10px] text-slate-500">Checking nearby availability…</span>
          </div>
        </div>
      </div>
    </div>
  )
}

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

/* ── Alerted card — grey, shows when trade was notified but hasn't opened the job ── */
function AlertedCard({ trade, index, elapsed }: { trade: AlertedTrade; index: number; elapsed: number }) {
  return (
    <div
      className="animate-fade-in-up p-3 rounded-2xl border border-slate-600/25 bg-slate-700/20"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center gap-3">
        {/* Grey avatar — blurred identity until they respond */}
        <div className="w-11 h-11 rounded-full bg-slate-600/50 animate-pulse flex-shrink-0 ring-2 ring-slate-600/30" />
        <div className="flex-1 min-w-0">
          {/* Shimmer name bar */}
          <div className="h-3 rounded-full bg-slate-600/50 animate-pulse mb-1.5" style={{ width: `${50 + (index % 3) * 12}%` }} />
          <div className="flex items-center gap-1.5">
            <Bell className="w-3 h-3 text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-500">Notified · {fmt(elapsed)}</span>
          </div>
        </div>
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500" />
        </span>
      </div>
    </div>
  )
}

/* ── Viewing card — blue, shows when trade opened the job but hasn't applied yet ── */
function ViewingCard({ trade, index }: { trade: AlertedTrade; index: number }) {
  const seenAgo = trade.viewedAt
    ? Math.floor((Date.now() - new Date(trade.viewedAt).getTime()) / 1000)
    : 0
  const seenLabel = seenAgo < 60 ? `${seenAgo}s ago` : `${Math.floor(seenAgo / 60)}m ago`

  return (
    <div
      className="animate-fade-in-up p-3 rounded-2xl border border-blue-500/35 bg-blue-500/10 shadow-sm shadow-blue-500/10"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 ring-2 ring-blue-500/40 overflow-hidden">
          {trade.avatarUrl
            ? <img src={trade.avatarUrl} alt={trade.name} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-blue-200">{trade.name.charAt(0).toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-blue-100 truncate">{trade.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Eye className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-blue-300">Reviewing your job</span>
          </div>
          <div className="text-[10px] text-blue-400/60 mt-0.5">Seen {seenLabel}</div>
        </div>
        {/* Pulsing blue dot */}
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400" />
        </span>
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
  const { activeSearch, setActiveSearch, clearActiveSearch } = useActiveSearch()

  const [phase, setPhase]                         = useState<Phase>("searching")
  const [trades, setTrades]                       = useState<Trade[]>([])
  const [alertedTrades, setAlertedTrades]         = useState<AlertedTrade[]>([])
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
  const [showBrowseCta, setShowBrowseCta]         = useState(false)

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

  /* ── background: been in "sent" for 90 s with 0 notified and no responses ── */
  useEffect(() => {
    if (stopped || phase !== "sent" || notifiedCount !== 0 || trades.length > 0) return
    const t = setTimeout(() => {
      setPhase((p) => p === "sent" ? "background" : p)
    }, 90000)
    return () => clearTimeout(t)
  }, [stopped, phase, notifiedCount, trades.length])

  /* ── background: expansion animation done, still 0 trade responses ── */
  useEffect(() => {
    if (phase !== "expanding" || isExpanding || trades.length !== 0) return
    const t = setTimeout(() => setPhase("background"), 2000)
    return () => clearTimeout(t)
  }, [phase, isExpanding, trades.length])

  /* ── browse CTA: show after 10 min with 0 trade responses ── */
  useEffect(() => {
    if (elapsed >= 600 && trades.length === 0 && !showBrowseCta && !stopped) {
      setShowBrowseCta(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, trades.length, stopped])

  /* ── no-response countdown → expanding (only if someone was notified) ── */
  useEffect(() => {
    if (stopped || trades.length > 0) return
    if (notifiedCount === 0) return
    if (["expanding", "first_accepted", "all_responded", "background"].includes(phase)) return

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
      expiresAt:     activeSearch?.expiresAt,   // preserve TTL from original set
      userId,
    })
    router.push("/")
  }

  const handleStopSearch = async () => {
    setStopped(true)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    // Clear the minimised search bar — the homeowner will see "Search paused" here, not a floating bar
    clearActiveSearch()
    try {
      await supabase.from("jobs").update({
        matching_status: "stopped",
        search_state: null,
      }).eq("id", job.id)
    } catch {}
  }

  // Resume a stopped search — restarts polling and updates DB
  const handleResumeSearch = async () => {
    setStopped(false)
    setPhase("sent")
    // Extend expiry if less than 5 min remaining so the resumed search has time
    try {
      const patch: Record<string, any> = { matching_status: "active", search_state: "active_search" }
      if (timeLeft < 300) {
        patch.expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        setTimeLeft(3600)
      }
      await supabase.from("jobs").update(patch).eq("id", job.id)
    } catch {}
  }

  // Soft cancel — marks job inactive so it moves to history; homeowner can reactivate later
  const handleCancelSearch = () => {
    setStopped(true)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    clearActiveSearch()
    router.push("/dashboard/homeowner")
    supabase.from("jobs").update({ is_active: false }).eq("id", job.id).then(() => {}).catch(() => {})
  }

  const handleNotifyMe = async () => {
    setNotifyRequested(true)
    try {
      await supabase.from("jobs").update({ notify_when_available: true }).eq("id", job.id)
    } catch {}
    setTimeout(() => router.push("/"), 1500)
  }

  const handleCancelRequest = () => {
    // Navigate immediately — DB update is fire-and-forget
    clearActiveSearch()
    router.push("/dashboard/homeowner")
    supabase.from("jobs").update({ is_active: false }).eq("id", job.id).then(() => {}).catch(() => {})
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

  const handleLeaveJobLive = () => {
    clearActiveSearch()
    router.push("/dashboard/homeowner")
    supabase.from("jobs").update({ is_active: true }).eq("id", job.id).then(() => {}).catch(() => {})
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

      // Update alerted trades (dispatched but not yet responded)
      if (data.alertedTrades !== undefined) {
        setAlertedTrades(
          (data.alertedTrades ?? []).map((a: any): AlertedTrade => ({
            id:       a.id,
            userId:   a.user_id,
            name:     a.name,
            avatarUrl: a.avatar_url ?? null,
            viewedAt: a.viewed_at ?? null,
          }))
        )
      }

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
              No one responded in time. You can keep searching, leave your job live, or browse nearby trades directly.
            </p>
          )}
          <div className="w-full max-w-sm space-y-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <button
              onClick={handleExtendSearch}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white transition-all duration-200 active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Extend Search +1 Hour</p>
                <p className="text-xs text-orange-100/70 font-normal mt-0.5">Keep notifying nearby tradespeople</p>
              </div>
            </button>

            <button
              onClick={() => {
                const params = new URLSearchParams({
                  tab:        "traders",
                  search:     job.title,
                  location:   job.location || "",
                  lat:        String(job.latitude  ?? 51.5074),
                  lng:        String(job.longitude ?? -0.1278),
                  radius:     String(radiusMiles),
                  autoSearch: "true",
                })
                router.push(`/?${params}`)
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white transition-all duration-200 active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Browse Nearby Trades</p>
                <p className="text-xs text-emerald-100/70 font-normal mt-0.5">
                  See {job.title.toLowerCase()}s available now on the map
                </p>
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
  /* STATUS BANNER CONFIG                                                */
  /* ─────────────────────────────────────────────────────────────────── */
  const stoppedBanner = {
    bg: "bg-slate-800/90 border-slate-700/50",
    icon: <StopCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />,
    title: (
      <span className="text-sm font-bold text-white tracking-tight">
        Search paused{trades.length > 0 ? ` · ${trades.length} applicant${trades.length !== 1 ? "s" : ""} found` : ""}
      </span>
    ),
    sub: (
      <div className="flex items-center gap-2 mt-1.5">
        <button
          onClick={handleResumeSearch}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Resume search
        </button>
        <button
          onClick={handleCancelSearch}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700 text-white font-semibold text-xs hover:bg-slate-600 border border-slate-600 transition-colors"
        >
          <TimerOff className="w-3 h-3" />
          Cancel search
        </button>
      </div>
    ),
  }

  const banners: Record<SearchingPhase, {
    bg: string; icon: React.ReactNode; title: React.ReactNode; sub: React.ReactNode; right?: React.ReactNode
  }> = {
    searching: {
      bg: "bg-emerald-950/60 border-emerald-500/20",
      icon: (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      ),
      title: <span className="text-sm font-bold text-white tracking-tight">Finding {job.title.toLowerCase()}s within {radiusMiles} miles</span>,
      sub:   <span className="text-xs text-emerald-400/90">Contacting the closest professionals to you · replies in 2–5 min</span>,
      right: null,
    },
    sent: {
      bg: elapsed < 150
        ? "bg-blue-950/60 border-blue-500/20"
        : "bg-indigo-950/60 border-indigo-500/20",
      icon: elapsed < 150
        ? <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
        : <Bell className="w-4 h-4 text-indigo-400 flex-shrink-0 animate-pulse" />,
      title: elapsed < 30 ? (
        <span className="text-sm font-bold text-white tracking-tight">
          {notifiedCount > 0 ? notifiedCount : "Several"} tradespeople notified nearby
        </span>
      ) : elapsed < 90 ? (
        <span className="text-sm font-bold text-white tracking-tight">Still searching — notifying more trades</span>
      ) : elapsed < 150 ? (
        <span className="text-sm font-bold text-white tracking-tight">Expanding your search radius</span>
      ) : (
        <span className="text-sm font-bold text-white tracking-tight">Search running in the background</span>
      ),
      sub: elapsed < 30 ? (
        <span className="text-xs text-blue-400/90">Waiting for responses — usually takes 2–5 minutes</span>
      ) : elapsed < 90 ? (
        <span className="text-xs text-blue-400/90">Hang tight — we're reaching out to more tradespeople</span>
      ) : elapsed < 150 ? (
        <span className="text-xs text-blue-400/90">Reaching out to more trades in a wider area</span>
      ) : (
        <span className="text-xs text-indigo-400/90">Tap Minimize — we'll alert you the moment someone responds</span>
      ),
    },
    first_accepted: {
      bg: "bg-emerald-950/70 border-emerald-500/30",
      icon: <PartyPopper className="w-4 h-4 text-emerald-300 flex-shrink-0" />,
      title: <span className="text-sm font-bold text-white tracking-tight">{firstAcceptedName} applied</span>,
      sub:   <span className="text-xs text-emerald-400/90">View their profile below · search is still running for more</span>,
    },
    expanding: {
      bg: "bg-amber-950/60 border-amber-500/20",
      icon: (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
        </span>
      ),
      title: <span className="text-sm font-bold text-white tracking-tight">Expanding search to {Math.min(radiusMiles * 2, 25)} miles</span>,
      sub:   <span className="text-xs text-amber-400/90">No nearby {job.title.toLowerCase()}s yet — widening the area</span>,
    },
    all_responded: {
      bg: "bg-emerald-950/70 border-emerald-500/30",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
      title: <span className="text-sm font-bold text-white tracking-tight">{trades.length} tradesperson{trades.length !== 1 ? "s" : ""} ready to help</span>,
      sub:   <span className="text-xs text-emerald-400/90">Compare profiles below and pick the best fit</span>,
    },
    background: {
      bg: "bg-slate-800/70 border-slate-700/40",
      icon: (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-40" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500" />
        </span>
      ),
      title: <span className="text-sm font-bold text-white tracking-tight">Still searching — no one free right now</span>,
      sub:   <span className="text-xs text-slate-400/90">We'll alert you the moment a {job.title.toLowerCase()} responds</span>,
      right: <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:block font-mono">{fmt(timeLeft)} left</span>,
    },
  }

  // When DB state says tradespeople have applied, show a "Respond soon!" nudge
  // regardless of the local phase — homeowner should see they have applicants.
  const pendingHomeownerBanner = {
    bg: "bg-amber-950/70 border-amber-500/30",
    icon: <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />,
    title: <span className="text-sm font-bold text-white tracking-tight">Tradespeople are waiting — respond now</span>,
    sub:   <span className="text-xs text-amber-400/90">Pick someone below before they take another job</span>,
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

        {stopped ? (
          <button
            onClick={() => router.push("/dashboard/homeowner")}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            <span className="hidden sm:inline">Done</span>
          </button>
        ) : (
          <button
            onClick={handleMinimize}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors"
            title="Minimize — search continues in background"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Minimize</span>
          </button>
        )}
      </div>

      {/* ── STATUS BANNER ───────────────────────────────────────── */}
      <div
        key={stopped ? "stopped" : phase}
        className={`animate-fade-in flex items-start gap-3 px-4 py-3 border-b flex-shrink-0 transition-colors duration-500 ${activeBanner.bg}`}
      >
        <div className="mt-0.5">{activeBanner.icon}</div>
        <div className="flex-1 min-w-0">
          <div>{activeBanner.title}</div>
          <div>{activeBanner.sub}</div>
        </div>
        {/* Stop button — only while actively searching */}
        {!stopped && (
          <button
            onClick={handleStopSearch}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-400 border border-slate-600/60 hover:border-red-500/50 px-2.5 py-1 rounded-full transition-colors mt-0.5"
            title="Pause the search"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pause</span>
          </button>
        )}
        {!stopped && (activeBanner as any).right}
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
            {/* ── Section header ── */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-white">
                {stopped ? "Applicants" : "Contacted Trades"}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {stopped
                  ? (trades.length > 0 ? `${trades.length} found` : "None yet")
                  : phase === "background"
                  ? "Monitoring…"
                  : (notifiedCount ? `${notifiedCount} alerted` : "Searching…")}
              </span>
            </div>

            {/* ── Legend (only when we have mixed states) ── */}
            {!stopped && (trades.length > 0 || alertedTrades.some(a => a.viewedAt)) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                {trades.length > 0 && (
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Applied</span>
                )}
                {alertedTrades.some(a => a.viewedAt) && (
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Reviewing</span>
                )}
                {alertedTrades.some(a => !a.viewedAt) && (
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" />Notified</span>
                )}
              </div>
            )}

            {/* ── STATE 3: RESPONDED (green) — top of list ── */}
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

            {/* ── STATE 2: VIEWING (blue) — middle ── */}
            {!stopped && (() => {
              const respondedIds = new Set(trades.map(t => t.id))
              const viewingTrades = alertedTrades.filter(a => a.viewedAt && !respondedIds.has(a.id))
              return viewingTrades.map((t, i) => (
                <ViewingCard key={`viewing-${t.id}`} trade={t} index={i} />
              ))
            })()}

            {/* ── Similar-trades badge (expanding / background) ── */}
            {!stopped && (phase === "expanding" || phase === "background") && (() => {
              const similar = getSimilarTrades(job.title)
              if (similar.length === 0) return null
              return (
                <div className="animate-fade-in flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-700/40 border border-slate-600/25">
                  <RefreshCw className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400">
                    Also checking: <span className="text-slate-300">{similar.slice(0, 2).join(", ")}</span>
                  </span>
                </div>
              )
            })()}

            {/* ── CheckingCard rows — background phase, no trades dispatched yet ── */}
            {!stopped && phase === "background" && trades.length === 0 && alertedTrades.length === 0 && (
              <>
                {[0, 1, 2].map((i) => <CheckingCard key={`checking-${i}`} index={i} />)}
              </>
            )}

            {/* ── STATE 1: ALERTED (grey) — bottom ── */}
            {!stopped && (() => {
              const respondedIds = new Set(trades.map(t => t.id))
              const justAlerted = alertedTrades.filter(a => !a.viewedAt && !respondedIds.has(a.id))
              if (justAlerted.length > 0) {
                return justAlerted.map((t, i) => (
                  <AlertedCard key={`alerted-${t.id}`} trade={t} index={i} elapsed={elapsed} />
                ))
              }
              // Fallback: generic skeletons while waiting for first poll
              // Not shown in background phase — CheckingCards handle that state
              if (phase === "background") return null
              return skeletonCount > 0 && Array.from({ length: skeletonCount }, (_, i) => (
                <SkeletonCard key={`sk-${i}`} index={i} elapsed={elapsed} />
              ))
            })()}

            {trades.length === 0 && stopped && (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No one applied before the search stopped.</p>
                <p className="text-xs mt-1">Try posting a flexible job to reach more trades.</p>
              </div>
            )}

            {/* ── Browse CTA — shown after 10 min with no responses ── */}
            {showBrowseCta && trades.length === 0 && !stopped && (
              <div className="animate-fade-in-up p-4 rounded-2xl border border-orange-500/25 bg-orange-500/[0.08] mt-1">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-200 leading-tight">
                      Want faster results?
                    </p>
                    <p className="text-xs text-orange-300/70 mt-0.5 leading-relaxed">
                      Browse available {job.title.toLowerCase()}s on the marketplace while we keep searching.
                    </p>
                    <button
                      onClick={() => router.push("/professionals")}
                      className="mt-2 text-xs font-semibold text-orange-300 hover:text-orange-200 transition-colors flex items-center gap-1"
                    >
                      View nearby trades <ArrowLeft className="w-3 h-3 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === "expanding" && !stopped && (
              <p className="animate-fade-in text-xs text-center text-amber-400/70 pt-1">
                Reaching further — more {job.title.toLowerCase()}s are being contacted…
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
