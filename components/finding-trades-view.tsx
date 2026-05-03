"use client"

import {
  useState, useEffect, useCallback, useRef, useLayoutEffect,
} from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft, CheckCircle2, MessageCircle, Phone,
  Star, MapPin, Zap, X, Edit, UserPlus,
  Bell, Clock, StopCircle, TimerOff, RefreshCw, Eye, Minimize2,
  PartyPopper, AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/client"
import { useActiveSearch } from "@/lib/contexts/active-search-context"

const FindingTradesMap = dynamic(() => import("./finding-trades-map"), { ssr: false })

/* ─── Types ─────────────────────────────────────────────────────── */
type Phase =
  | "searching"
  | "sent"
  | "first_accepted"
  | "expanding"
  | "all_responded"
  | "background"
  | "timed_out"

type TradeStatus = "waiting" | "accepted" | "declined"
type Snap = "peek" | "half" | "full"

interface Trade {
  id: string
  userId: string
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
  id: string
  userId: string
  name: string
  avatarUrl?: string | null
  viewedAt?: string | null
  lat?: number | null
  lng?: number | null
}

interface FindingTradesViewProps {
  job: Job
  userId: string
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

function etaLabel(mi: number): string {
  if (!mi || mi <= 0) return ""
  const mins = Math.round((mi / 25) * 60 / 5) * 5
  if (mins < 5) return "< 5 min"
  if (mins > 60) return "> 1 hr"
  return `~${mins} min`
}

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
function getSimilarTrades(title: string) {
  const lower = title.toLowerCase().replace(/s$/, "")
  return SIMILAR_TRADES[lower] ?? []
}

/* ─── Sound ──────────────────────────────────────────────────────── */
function playResponseSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = (freq: number, start: number, dur: number, vol = 0.55) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = "sine"; o.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime + start)
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.008)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur)
    }
    osc(880, 0, 0.16); osc(1046.5, 0.16, 0.16); osc(1318.5, 0.32, 0.42, 0.65)
    try { navigator.vibrate?.([120, 50, 250]) } catch {}
  } catch {}
}

/* ─── Sheet status badge ─────────────────────────────────────────── */
function SheetStatusBadge({ phase, stopped, notifiedCount, tradesCount, dbJobState }: {
  phase: Phase; stopped: boolean; notifiedCount: number; tradesCount: number; dbJobState: string | null
}) {
  if (stopped) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/80 text-slate-300 text-[11px] font-semibold">
      <StopCircle className="w-3 h-3" />
      {tradesCount > 0 ? `${tradesCount} applied` : "Paused"}
    </span>
  )
  if (dbJobState === "pending_homeowner" && tradesCount > 0) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-semibold animate-pulse">
      <Zap className="w-3 h-3" /> Respond now — {tradesCount} waiting
    </span>
  )
  if (phase === "first_accepted" || phase === "all_responded") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold">
      <CheckCircle2 className="w-3 h-3" />
      {tradesCount === 1 ? "1 applied" : `${tradesCount} applied`}
    </span>
  )
  if (phase === "background") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-400 text-[11px] font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-50" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500" />
      </span>
      Monitoring
    </span>
  )
  if (phase === "expanding") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-300 text-[11px] font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
      Expanding area
    </span>
  )
  if (notifiedCount > 0) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/12 text-blue-300 text-[11px] font-semibold">
      <Bell className="w-3 h-3" />
      {notifiedCount} notified
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-300 text-[11px] font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      Searching…
    </span>
  )
}

/* ─── Trade status badge ─────────────────────────────────────────── */
function StatusBadge({ status }: { status: TradeStatus }) {
  if (status === "accepted") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold tracking-wide">
      <CheckCircle2 className="w-2.5 h-2.5" /> Applied
    </span>
  )
  if (status === "declined") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400/80 text-[10px] font-bold tracking-wide">
      <X className="w-2.5 h-2.5" /> Unavailable
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400 text-[10px] font-bold tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
      Notified
    </span>
  )
}

/* ─── Trade card ─────────────────────────────────────────────────── */
interface TradeCardProps {
  trade: Trade
  index: number
  onMessage: (t: Trade) => void
  onCall: (t: Trade) => void
  onConfirm: (t: Trade) => void
  confirming?: boolean
}

function TradeCard({ trade, index, onMessage, onCall, onConfirm, confirming }: TradeCardProps) {
  const eta = etaLabel(trade.distanceMiles)
  const isAcc = trade.status === "accepted"
  const isDec = trade.status === "declined"

  return (
    <div
      className={`animate-fade-in-up rounded-2xl border overflow-hidden transition-all duration-300 ${
        isAcc
          ? "bg-slate-800 border-emerald-500/35 shadow-md shadow-emerald-500/8"
          : isDec
          ? "bg-slate-800/40 border-slate-700/30 opacity-45"
          : "bg-slate-800 border-slate-700/50"
      }`}
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {/* Accepted top accent line */}
      {isAcc && <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />}

      <div className="p-3.5">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <a
              href={`/companies/${trade.id}`}
              className={`block w-12 h-12 rounded-full overflow-hidden bg-slate-700 ring-2 ring-offset-1 ring-offset-slate-800 transition-all duration-300 ${
                isAcc ? "ring-emerald-500/60" : "ring-slate-600/40"
              }`}
            >
              {trade.avatarUrl
                ? <img src={trade.avatarUrl} alt={trade.name} className="w-full h-full object-cover" />
                : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-200">
                    {(trade.businessName || trade.name).charAt(0).toUpperCase()}
                  </span>
              }
            </a>
            {trade.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-emerald-500 rounded-full border-2 border-slate-800 flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <a href={`/companies/${trade.id}`}
              className="block text-sm font-semibold text-white truncate hover:text-emerald-300 transition-colors leading-tight">
              {trade.businessName || trade.name}
            </a>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {trade.rating.toFixed(1)}
                <span className="text-slate-500 ml-0.5">({trade.reviewCount})</span>
              </span>
              {trade.distanceMiles > 0 && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {trade.distanceMiles.toFixed(1)} mi
                </span>
              )}
            </div>
          </div>

          {/* Right: badge + ETA */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <StatusBadge status={trade.status} />
            {!isDec && eta && (
              <span className="text-[10px] text-slate-500 font-mono">{eta}</span>
            )}
          </div>
        </div>

        {/* Message quote */}
        {isAcc && trade.message && (
          <div className="mt-2.5">
            <p className="text-xs text-slate-300 bg-slate-700/50 rounded-xl px-3 py-2 leading-relaxed italic border border-slate-600/30">
              &ldquo;{trade.message}&rdquo;
            </p>
          </div>
        )}

        {/* Action buttons */}
        {isAcc && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onMessage(trade)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white text-xs font-semibold transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Message
            </button>
            {trade.phone && (
              <button
                onClick={() => onCall(trade)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-500/45 text-emerald-400 hover:bg-emerald-500/10 active:scale-[0.97] text-xs font-semibold transition-all"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
            )}
            <button
              onClick={() => onConfirm(trade)}
              disabled={confirming}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.97] disabled:opacity-50 text-white text-xs font-semibold transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {confirming ? "…" : "Hire"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Viewing card (blue) ────────────────────────────────────────── */
function ViewingCard({ trade, index }: { trade: AlertedTrade; index: number }) {
  const seenAgo = trade.viewedAt
    ? Math.floor((Date.now() - new Date(trade.viewedAt).getTime()) / 1000)
    : 0
  const seenLabel = seenAgo < 60 ? `${seenAgo}s ago` : `${Math.floor(seenAgo / 60)}m ago`

  return (
    <div
      className="animate-fade-in-up flex items-center gap-3 p-3.5 rounded-2xl bg-blue-500/6 border border-blue-500/25"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <div className="w-11 h-11 rounded-full bg-blue-500/15 overflow-hidden flex-shrink-0 ring-2 ring-blue-500/30">
        {trade.avatarUrl
          ? <img src={trade.avatarUrl} alt={trade.name} className="w-full h-full object-cover" />
          : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-blue-200">
              {trade.name.charAt(0).toUpperCase()}
            </span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-blue-100 truncate">{trade.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Eye className="w-3 h-3 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-300">Reviewing · {seenLabel}</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[10px] font-bold flex-shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-55" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
        </span>
        Reviewing
      </span>
    </div>
  )
}

/* ─── Alerted card (grey) ────────────────────────────────────────── */
function AlertedCard({ trade, index, elapsed }: { trade: AlertedTrade; index: number; elapsed: number }) {
  return (
    <div
      className="animate-fade-in-up flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/40"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      <div className="w-11 h-11 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 ring-2 ring-slate-600/30">
        {trade.avatarUrl
          ? <img src={trade.avatarUrl} alt={trade.name} className="w-full h-full object-cover" />
          : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-300">
              {trade.name.charAt(0).toUpperCase()}
            </span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-300 truncate leading-tight">{trade.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Bell className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span className="text-xs text-slate-500">Notified · {fmt(elapsed)}</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 text-[10px] font-bold flex-shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-50" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500" />
        </span>
        Waiting
      </span>
    </div>
  )
}

/* ─── Skeleton card ──────────────────────────────────────────────── */
function SkeletonCard({ index, elapsed }: { index: number; elapsed: number }) {
  return (
    <div
      className="animate-fade-in-up flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/40"
      style={{ animationDelay: `${index * 90}ms`, animationFillMode: "both" }}
    >
      <div className="w-11 h-11 rounded-full bg-slate-700/70 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded-full bg-slate-700/70 animate-pulse" style={{ width: `${58 + index * 9}%` }} />
        <div className="h-2.5 rounded-full bg-slate-700/70 animate-pulse w-1/2" />
      </div>
      <span className="text-xs font-mono text-amber-400/70 flex-shrink-0">{fmt(Math.max(0, elapsed - index * 6))}</span>
    </div>
  )
}

/* ─── Checking card (background phase) ──────────────────────────── */
function CheckingCard({ index }: { index: number }) {
  return (
    <div
      className="animate-fade-in-up flex items-center gap-3 p-3.5 rounded-2xl border border-slate-700/30 bg-slate-800/40"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    >
      <div className="w-11 h-11 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-600/20">
        <RefreshCw className="w-4 h-4 text-slate-500" style={{ animation: "spin 3s linear infinite" }} />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-2.5 rounded-full bg-slate-700/50 animate-pulse" style={{ width: `${55 + index * 10}%` }} />
        <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500" />
          </span>
          Checking nearby availability…
        </span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Component                                                           */
/* ═══════════════════════════════════════════════════════════════════ */
const PEEK_H    = 116   // px of sheet visible in "peek" snap (handle + status + radius)
const HALF_VIS  = 0.50  // fraction of viewport height visible in "half" snap
const FULL_VIS  = 0.88  // fraction of viewport height visible in "full" snap
const HEADER_H  = 52    // px — compact top header (layout constant; safe-area added via CSS)
const ACTION_H  = 66    // px — bottom action bar (tall enough for 44px tap targets)

export function FindingTradesView({ job, userId }: FindingTradesViewProps) {
  const router   = useRouter()
  const supabase = createClient()
  const { activeSearch, setActiveSearch, clearActiveSearch } = useActiveSearch()

  /* ── Job phase / state ──────────────────────────────────────── */
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
  const [stopped, setStopped]                     = useState(false)
  const [dbJobState, setDbJobState]               = useState<string | null>(job.job_state ?? null)
  const [confirmingId, setConfirmingId]           = useState<string | null>(null)
  const isFlexibleJob = job.urgency_type === "flexible"
  const [timeLeft, setTimeLeft]                   = useState<number>(() => {
    if (!job.expires_at || isFlexibleJob) return 3600
    return Math.max(0, Math.min(Math.floor((new Date(job.expires_at).getTime() - Date.now()) / 1000), 3600))
  })
  const [showBrowseCta, setShowBrowseCta]         = useState(false)
  const [notifyRequested, setNotifyRequested]     = useState(false)

  const prevAcceptedRef  = useRef(false)
  const pollFailsRef     = useRef(0)
  const pollIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const lat = job.latitude  ?? 51.5074
  const lon = job.longitude ?? -0.1278

  /* ── Draggable bottom sheet ─────────────────────────────────── */
  const sheetRef      = useRef<HTMLDivElement>(null)
  const sheetMaxHRef  = useRef(0)
  const snapRef       = useRef<Snap>("half")
  const isDragRef     = useRef(false)
  const dragDataRef   = useRef({ startY: 0, startTY: 0 })
  const velocityRef   = useRef(0)
  const lastPYRef     = useRef(0)
  const lastPTRef     = useRef(0)

  const [snap, setSnap]         = useState<Snap>("half")
  const [translateY, setTY]     = useState(9999)   // off-screen until layout
  const [isDragging, setIsDrag] = useState(false)

  const getSnapTY = useCallback((s: Snap): number => {
    const h = sheetMaxHRef.current
    if (!h) return 0
    if (s === "full") return 0
    if (s === "half") return h * (1 - HALF_VIS)
    return h - PEEK_H
  }, [])

  const snapTo = useCallback((s: Snap) => {
    const y = getSnapTY(s)
    snapRef.current = s
    setSnap(s)
    setTY(y)
  }, [getSnapTY])

  useLayoutEffect(() => {
    const h = window.innerHeight * FULL_VIS
    sheetMaxHRef.current = h
    const y = h * (1 - HALF_VIS)
    setTY(y)
    const onResize = () => {
      const nh = window.innerHeight * FULL_VIS
      sheetMaxHRef.current = nh
      snapTo(snapRef.current)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [snapTo])

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragRef.current = true
    setIsDrag(true)
    dragDataRef.current = { startY: e.clientY, startTY: translateY }
    lastPYRef.current  = e.clientY
    lastPTRef.current  = e.timeStamp
    velocityRef.current = 0
  }

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragRef.current) return
    const dt = e.timeStamp - lastPTRef.current
    if (dt > 0) velocityRef.current = (e.clientY - lastPYRef.current) / dt
    lastPYRef.current = e.clientY
    lastPTRef.current = e.timeStamp
    const delta  = e.clientY - dragDataRef.current.startY
    const maxTY  = sheetMaxHRef.current - PEEK_H
    const newTY  = Math.max(0, Math.min(maxTY, dragDataRef.current.startTY + delta))
    setTY(newTY)
  }

  const handleDragEnd = () => {
    if (!isDragRef.current) return
    isDragRef.current = false
    setIsDrag(false)
    const vel = velocityRef.current   // px/ms — positive = moving down
    let next: Snap
    const cur = snapRef.current
    if (vel > 0.45) {
      next = cur === "full" ? "half" : "peek"
    } else if (vel < -0.45) {
      next = cur === "peek" ? "half" : "full"
    } else {
      const h   = sheetMaxHRef.current
      const vis = (h - translateY) / h
      next = vis > 0.72 ? "full" : vis > 0.28 ? "half" : "peek"
    }
    snapTo(next)
  }

  /* ── Phase effects ──────────────────────────────────────────── */
  useEffect(() => {
    if (!job.expires_at || isFlexibleJob) return
    if (new Date(job.expires_at).getTime() - Date.now() <= 0) {
      setStopped(true); setPhase("timed_out")
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stopped || !job.expires_at || isFlexibleJob) return
    const t = setInterval(() => setTimeLeft((p) => {
      if (p <= 1) {
        setStopped(true); setPhase("timed_out")
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        return 0
      }
      return p - 1
    }), 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped])

  useEffect(() => {
    if (stopped) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [stopped])

  useEffect(() => {
    if (stopped) return
    const t = setTimeout(() => setPhase((p) => p === "searching" ? "sent" : p), 3000)
    return () => clearTimeout(t)
  }, [stopped])

  useEffect(() => {
    if (stopped || phase !== "sent" || notifiedCount !== 0 || trades.length > 0) return
    const t = setTimeout(() => setPhase((p) => p === "sent" ? "background" : p), 90_000)
    return () => clearTimeout(t)
  }, [stopped, phase, notifiedCount, trades.length])

  useEffect(() => {
    if (phase !== "expanding" || isExpanding || trades.length !== 0) return
    const t = setTimeout(() => setPhase("background"), 2000)
    return () => clearTimeout(t)
  }, [phase, isExpanding, trades.length])

  useEffect(() => {
    if (elapsed >= 600 && trades.length === 0 && !showBrowseCta && !stopped)
      setShowBrowseCta(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, trades.length, stopped])

  useEffect(() => {
    if (stopped || trades.length > 0 || notifiedCount === 0) return
    if (["expanding", "first_accepted", "all_responded", "background"].includes(phase)) return
    const t = setInterval(() => setNoRespSecs((s) => {
      if (s <= 1) { triggerExpand(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped, trades.length, phase, notifiedCount])

  useEffect(() => {
    const hasAcc = trades.some((t) => t.status === "accepted")
    if (hasAcc && !prevAcceptedRef.current) {
      prevAcceptedRef.current = true
      const first = trades.find((t) => t.status === "accepted")
      setFirstAcceptedName(first?.businessName || first?.name || "A tradesperson")
      setPhase("first_accepted")
      if (trades.filter((t) => t.status === "accepted").length > 1) setPhase("all_responded")
      // Snap sheet to half when first response arrives so user sees it
      if (snapRef.current === "peek") snapTo("half")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades])

  /* ── Expand search radius ───────────────────────────────────── */
  const triggerExpand = async () => {
    setPhase("expanding"); setIsExpanding(true); setExpandSlots(2)
    try {
      const newR = Math.min(radiusMiles * 2, 25)
      await supabase.from("jobs").update({ search_radius_miles: newR, search_state: "active_search" }).eq("id", job.id)
      setRadiusMiles(newR)
    } catch {}
    setTimeout(() => setIsExpanding(false), 6000)
  }

  /* ── Action handlers ────────────────────────────────────────── */
  const handleMinimize = () => {
    setActiveSearch({ jobId: job.id, jobTitle: job.title, tradesCount: trades.length, notifiedCount, phase, startedAt: Date.now() - elapsed * 1000, expiresAt: activeSearch?.expiresAt, userId })
    router.push("/")
  }

  const handleStopSearch = async () => {
    setStopped(true)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    clearActiveSearch()
    try { await supabase.from("jobs").update({ matching_status: "stopped", search_state: null }).eq("id", job.id) } catch {}
  }

  const handleResumeSearch = async () => {
    setStopped(false); setPhase("sent")
    try {
      const patch: Record<string, any> = { matching_status: "active", search_state: "active_search" }
      if (timeLeft < 300) { patch.expires_at = new Date(Date.now() + 3_600_000).toISOString(); setTimeLeft(3600) }
      await supabase.from("jobs").update(patch).eq("id", job.id)
    } catch {}
  }

  const cancelJob = () => {
    setStopped(true)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    clearActiveSearch()
    fetch(`/api/jobs/${job.id}/cancel`, { method: "POST", credentials: "include" }).catch(() => {})
    router.push("/dashboard/homeowner/jobs?status=closed")
  }

  const handleCancelSearch  = cancelJob
  const handleCancelRequest = cancelJob

  const handleExtendSearch = async () => {
    const newExpiry = new Date(Date.now() + 3_600_000).toISOString()
    try { await supabase.from("jobs").update({ expires_at: newExpiry, search_state: "active_search" }).eq("id", job.id) } catch {}
    setTimeLeft(3600); setStopped(false); setPhase("sent")
  }

  const handleLeaveJobLive = () => {
    clearActiveSearch()
    router.push("/dashboard/homeowner")
    supabase.from("jobs").update({ is_active: true }).eq("id", job.id).catch(() => {})
  }

  const handleContactMore = () => { if (phase !== "expanding") triggerExpand() }

  const handleNotifyMe = async () => {
    setNotifyRequested(true)
    try { await supabase.from("jobs").update({ notify_when_available: true }).eq("id", job.id) } catch {}
    setTimeout(() => router.push("/"), 1500)
  }

  /* ── Poll for responses ─────────────────────────────────────── */
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}/urgent-responses`, { credentials: "include" })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403)
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        return
      }
      pollFailsRef.current = 0
      const data = await res.json()
      if (data.notifiedCount)   setNotifiedCount(data.notifiedCount)
      if (!data.notifiedCount && data.responses?.length > 0) setNotifiedCount(data.responses.length)
      if (data.jobState)        setDbJobState(data.jobState)

      if (data.alertedTrades !== undefined) {
        setAlertedTrades((data.alertedTrades ?? []).map((a: any): AlertedTrade => ({
          id: a.id, userId: a.user_id, name: a.name,
          avatarUrl: a.avatar_url ?? null, viewedAt: a.viewed_at ?? null,
          lat: a.lat ?? null, lng: a.lng ?? null,
        })))
      }

      if (data.responses?.length > 0) {
        const now = Date.now()
        setTrades((prev) => {
          const incoming: Trade[] = data.responses.map((r: any, i: number): Trade => ({
            id: r.id, userId: r.user_id, name: r.name, businessName: r.business_name,
            avatarUrl: r.avatar_url, rating: r.rating ?? 4.5, reviewCount: r.review_count ?? 0,
            distanceMiles: r.distance_miles ?? 0, respondedAt: r.response_time ?? "Just now",
            verified: r.verified ?? false, status: "accepted", phone: r.phone,
            message: r.message ?? undefined, addedAt: now + i * 150,
            lat: r.lat ?? null, lng: r.lng ?? null,
          }))
          const ids = new Set(prev.map((t) => t.id))
          const newOnes = incoming.filter((t) => !ids.has(t.id))
          if (newOnes.length > 0) playResponseSound()
          return [...prev, ...newOnes]
        })
        if (data.responses.length > 1) setPhase("all_responded")
      }
    } catch {
      pollFailsRef.current++
      if (pollFailsRef.current >= 5) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }
    }
  }, [job.id])

  useEffect(() => {
    if (stopped) return
    poll()
    pollIntervalRef.current = setInterval(poll, 5000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [poll, stopped])

  useEffect(() => {
    if (stopped) return
    const channel = supabase
      .channel(`finding-trades-${job.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_applications", filter: `job_id=eq.${job.id}` }, poll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [job.id, supabase, poll, stopped])

  /* ── Conversation helper ────────────────────────────────────── */
  const openConversation = async (trade: Trade) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ with_user_id: trade.userId }),
      })
      const body = await res.json().catch(() => ({}))
      router.push(body.conversationId ? `/messages/${body.conversationId}?job=${job.id}` : "/messages")
    } catch { router.push("/messages") }
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
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ company_id: trade.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok || res.status === 409) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        clearActiveSearch()
        router.push(body.conversationId ? `/messages/${body.conversationId}?job=${job.id}&uid=${encodeURIComponent(trade.userId)}` : "/messages")
      }
    } catch { clearActiveSearch(); router.push("/messages") }
    finally { setConfirmingId(null) }
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* TIMED OUT SCREEN                                                */
  /* ═══════════════════════════════════════════════════════════════ */
  if (phase === "timed_out") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/70 flex-shrink-0">
          <button onClick={() => router.back()} className="p-1.5 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
              <TimerOff className="w-4 h-4 text-red-400" /> Search Timed Out
            </p>
            <p className="text-xs text-slate-400">{job.title} · {radiusMiles} mi radius</p>
          </div>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center overflow-y-auto">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 animate-pop-in">
            <TimerOff className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            1-hour window ended
          </h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xs animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            {trades.length > 0
              ? `${trades.length} tradesperson${trades.length !== 1 ? "s have" : " has"} already applied. Choose below or extend your search.`
              : "No one responded in time. You can extend, leave the job live, or browse nearby trades."}
          </p>
          <div className="w-full max-w-sm space-y-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <button onClick={handleExtendSearch} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Extend Search +1 Hour</p>
                <p className="text-xs text-orange-100/70 font-normal mt-0.5">Keep notifying nearby tradespeople</p>
              </div>
            </button>
            <button
              onClick={() => router.push(`/?tab=traders&search=${encodeURIComponent(job.title)}&lat=${lat}&lng=${lon}&radius=${radiusMiles}&autoSearch=true`)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.98] text-white transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Browse Nearby Trades</p>
                <p className="text-xs text-emerald-100/70 font-normal mt-0.5">See available {job.title.toLowerCase()}s on the map</p>
              </div>
            </button>
            <button onClick={handleLeaveJobLive} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 active:scale-[0.98] text-white transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-sm">Leave Job Live</p>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Trades can still find and apply</p>
              </div>
            </button>
            <button onClick={handleCancelRequest} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 hover:border-red-500/30 active:scale-[0.98] text-white transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-700/80 flex items-center justify-center flex-shrink-0">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-red-300">Cancel Request</p>
                <p className="text-xs text-slate-400 font-normal mt-0.5">Remove the job completely</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* MAIN RENDER — Uber-style split layout                          */
  /* ═══════════════════════════════════════════════════════════════ */
  const respondedIds   = new Set(trades.map((t) => t.id))
  const viewingTrades  = alertedTrades.filter((a) => a.viewedAt && !respondedIds.has(a.id))
  const justAlerted    = alertedTrades.filter((a) => !a.viewedAt && !respondedIds.has(a.id))
  const skeletonCount  = stopped ? 0 : Math.max(0, 3 + expandSlots - trades.length - alertedTrades.length)
  const similar        = getSimilarTrades(job.title)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "#dfe3e8" }}>

      {/* ── Compact header ──────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-[100] flex items-center gap-2 px-3 pt-safe pl-safe pr-safe"
        style={{
          minHeight: HEADER_H,
          paddingTop: `max(0.5rem, env(safe-area-inset-top, 0px))`,
          paddingBottom: "0.5rem",
          background: "rgba(15,23,42,0.93)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(51,65,85,0.5)",
        }}
      >
        <button
          onClick={stopped ? () => router.push("/dashboard/homeowner") : () => router.back()}
          className="p-2 text-slate-400 hover:text-white transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            stopped ? "bg-slate-500" :
            phase === "first_accepted" || phase === "all_responded" ? "bg-emerald-400" :
            "bg-emerald-400 animate-pulse"
          }`} />
          <span className="text-sm font-semibold text-white truncate">{job.title}</span>
          <span className="text-xs text-slate-500 flex-shrink-0">{radiusMiles} mi</span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!stopped && job.expires_at && !isFlexibleJob && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              timeLeft < 300 ? "bg-red-500/15 text-red-300 border-red-500/30 animate-pulse" :
              timeLeft < 600 ? "bg-orange-500/12 text-orange-300 border-orange-500/25" :
              "bg-slate-800/80 text-slate-400 border-slate-700/50"
            }`}>
              <Clock className="w-2.5 h-2.5" />
              {fmt(timeLeft)}
            </span>
          )}
          {!stopped && isFlexibleJob && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/12 text-emerald-400 border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live
            </span>
          )}
          {!stopped && (
            <button onClick={handleMinimize} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Minimize">
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Full-screen map — z-0 keeps it below the sheet (z-[60]) ── */}
      <div className="absolute inset-0 z-0" style={{ top: `calc(${HEADER_H}px + env(safe-area-inset-top, 0px))` }}>
        <FindingTradesMap
          lat={lat}
          lon={lon}
          searchRadiusMiles={radiusMiles}
          isExpanding={isExpanding && !stopped}
          trades={[
            ...trades.map((t) => ({
              id: t.id,
              name: t.businessName || t.name,
              distanceMiles: t.distanceMiles,
              status: t.status as "waiting" | "accepted" | "declined",
              lat: t.lat,
              lng: t.lng,
            })),
            ...alertedTrades.map((a) => ({
              id: a.id,
              name: a.name,
              distanceMiles: 0,
              status: "waiting" as const,
              lat: a.lat,
              lng: a.lng,
            })),
          ]}
          alertedCount={alertedTrades.length}
        />
      </div>

      {/* ── Draggable bottom sheet ───────────────────────────────── */}
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 bottom-0 z-[60] flex flex-col rounded-t-[20px] overflow-hidden"
        style={{
          height: sheetMaxHRef.current ? `${sheetMaxHRef.current}px` : "88dvh",
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? "none" : "transform 0.38s cubic-bezier(0.32,0.72,0,1)",
          willChange: "transform",
          background: "#0f172a",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* ── Sheet handle + compact status ────────────────────── */}
        <div
          className="flex-shrink-0 select-none touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          {/* Drag pill */}
          <div className="flex justify-center pt-3 pb-2.5">
            <div className="w-10 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Status badge + actions row */}
          <div className="flex items-center gap-2 px-4 pb-2.5">
            <SheetStatusBadge
              phase={phase}
              stopped={stopped}
              notifiedCount={notifiedCount}
              tradesCount={trades.length}
              dbJobState={dbJobState}
            />

            <div className="flex-1" />

            {/* First-accepted announcement */}
            {phase === "first_accepted" && !stopped && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
                <PartyPopper className="w-3 h-3" /> {firstAcceptedName.split(" ")[0]} applied!
              </span>
            )}

            {!stopped && (
              <button
                onClick={handleStopSearch}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-400 px-2.5 py-1 rounded-full border border-slate-700/60 hover:border-red-500/35 transition-colors flex-shrink-0"
              >
                <StopCircle className="w-3 h-3" /> Pause
              </button>
            )}
            {stopped && (
              <button
                onClick={handleResumeSearch}
                className="flex items-center gap-1 text-[11px] text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-3 h-3" /> Resume
              </button>
            )}
          </div>

          {/* Radius chips — only while actively searching */}
          {!stopped && (
            <div className="flex items-center gap-1.5 px-4 pb-3">
              <MapPin className="w-3 h-3 text-slate-600 flex-shrink-0" />
              <div className="flex gap-1 flex-wrap">
                {[5, 10, 15, 20, 25].map((mi) => (
                  <button
                    key={mi}
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (mi === radiusMiles) return
                      setRadiusMiles(mi)
                      try { await supabase.from("jobs").update({ search_radius_miles: mi }).eq("id", job.id) } catch {}
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                      mi === radiusMiles
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {mi}mi
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-800/80" />
        </div>

        {/* ── Scrollable trade list ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
          <div className="px-4 pt-3 pb-4 space-y-2.5">

            {/* Section label */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {stopped ? "Applicants" : "Contacted Tradespeople"}
              </span>
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[11px] text-slate-600">
                {stopped
                  ? (trades.length > 0 ? `${trades.length} found` : "None")
                  : phase === "background" ? "Monitoring…"
                  : notifiedCount ? `${notifiedCount} alerted` : "Searching…"}
              </span>
            </div>

            {/* Accepted trades (always first) */}
            {trades.map((t, i) => (
              <TradeCard
                key={t.id}
                trade={t}
                index={i}
                onMessage={(trade) => contact(trade, "message")}
                onCall={(trade) => contact(trade, "call")}
                onConfirm={handleConfirm}
                confirming={confirmingId === t.id}
              />
            ))}

            {/* Viewing trades (blue) */}
            {!stopped && viewingTrades.map((t, i) => (
              <ViewingCard key={`viewing-${t.id}`} trade={t} index={i} />
            ))}

            {/* Similar-trades badge */}
            {!stopped && (phase === "expanding" || phase === "background") && similar.length > 0 && (
              <div className="animate-fade-in flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30">
                <RefreshCw className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="text-[11px] text-slate-400">
                  Also checking: <span className="text-slate-300">{similar.slice(0, 2).join(", ")}</span>
                </span>
              </div>
            )}

            {/* Checking cards (background, no alerted) */}
            {!stopped && phase === "background" && trades.length === 0 && alertedTrades.length === 0 && (
              [0, 1, 2].map((i) => <CheckingCard key={`ck-${i}`} index={i} />)
            )}

            {/* Alerted (notified) trades */}
            {!stopped && (justAlerted.length > 0
              ? justAlerted.map((t, i) => <AlertedCard key={`al-${t.id}`} trade={t} index={i} elapsed={elapsed} />)
              : phase !== "background" && skeletonCount > 0
                ? Array.from({ length: skeletonCount }, (_, i) => <SkeletonCard key={`sk-${i}`} index={i} elapsed={elapsed} />)
                : null
            )}

            {/* Empty stopped state */}
            {trades.length === 0 && stopped && (
              <div className="text-center py-10 text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No one applied before the search stopped.</p>
                <p className="text-xs mt-1">Try resuming or posting a flexible job.</p>
              </div>
            )}

            {/* Browse CTA */}
            {showBrowseCta && trades.length === 0 && !stopped && (
              <div className="animate-fade-in-up p-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.07]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-200">Want faster results?</p>
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
              <p className="animate-fade-in text-xs text-center text-amber-400/60 pt-1">
                Reaching further — more {job.title.toLowerCase()}s are being contacted…
              </p>
            )}
          </div>
        </div>

        {/* ── Bottom action bar ────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex items-center gap-1 px-2 bg-slate-900/95 border-t border-slate-800/80"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))", paddingTop: "0.5rem" }}
        >
          {stopped ? (
            <>
              <button
                onClick={() => router.push("/dashboard/homeowner")}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-800 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[10px] font-medium">Dashboard</span>
              </button>
              <div className="w-px h-8 bg-slate-800" />
              <button
                onClick={() => router.push(`/dashboard/homeowner/jobs/${job.id}`)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-emerald-400 hover:bg-emerald-500/10 active:bg-emerald-500/10 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-medium">View Job</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelRequest}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/8 active:bg-red-500/10 transition-all"
              >
                <X className="w-4 h-4" />
                <span className="text-[10px] font-medium">Cancel</span>
              </button>
              <div className="w-px h-8 bg-slate-800" />
              <button
                onClick={handleContactMore}
                disabled={phase === "expanding"}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-emerald-400 hover:bg-emerald-500/8 active:bg-emerald-500/10 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-[10px] font-medium">Contact More</span>
              </button>
              <div className="w-px h-8 bg-slate-800" />
              <button
                onClick={() => router.push(`/dashboard/homeowner/jobs/${job.id}/edit`)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-800 transition-all"
              >
                <Edit className="w-4 h-4" />
                <span className="text-[10px] font-medium">Edit Job</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
