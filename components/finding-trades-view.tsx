"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft, CheckCircle2, MessageCircle, Phone,
  Star, MapPin, Users, Zap, X, Edit, UserPlus,
  PartyPopper, Minimize2, Bell, AlertCircle, Clock,
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

type SearchingPhase = Exclude<Phase, "no_trades">

type TradeStatus = "waiting" | "accepted" | "declined"

interface Trade {
  id: string
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
  addedAt: number
}

interface Job {
  id: string
  title: string
  location: string
  latitude: number | null
  longitude: number | null
  urgency_type: string | null
  search_radius_miles: number | null
}

interface FindingTradesViewProps {
  job: Job
  userId: string
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

  const lat = job.latitude  ?? 51.5074
  const lon = job.longitude ?? -0.1278

  const prevAcceptedRef = useRef(false)

  /* ── when viewing this page, clear any minimised-bar state ── */
  useEffect(() => {
    clearActiveSearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── elapsed ticker ── */
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  /* ── 3 s: searching → sent ── */
  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => p === "searching" ? "sent" : p), 3000)
    return () => clearTimeout(t)
  }, [])

  /* ── no_trades: been in "sent" for 8 s with 0 notified → nobody nearby ── */
  useEffect(() => {
    if (phase !== "sent" || notifiedCount !== 0) return
    const t = setTimeout(() => {
      setPhase((p) => p === "sent" ? "no_trades" : p)
    }, 8000)
    return () => clearTimeout(t)
  }, [phase, notifiedCount])

  /* ── no_trades: expansion animation done, still 0 trade responses ── */
  useEffect(() => {
    if (phase !== "expanding" || isExpanding || trades.length !== 0) return
    const t = setTimeout(() => setPhase("no_trades"), 2000)
    return () => clearTimeout(t)
  }, [phase, isExpanding, trades.length])

  /* ── no-response countdown → expanding (only if someone was notified) ── */
  useEffect(() => {
    if (trades.length > 0) return
    if (notifiedCount === 0) return  // nobody notified yet — handled by no_trades detection
    if (["expanding", "first_accepted", "all_responded", "no_trades"].includes(phase)) return

    const t = setInterval(() => {
      setNoRespSecs((s) => {
        if (s <= 1) { triggerExpand(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades.length, phase, notifiedCount])

  /* ── detect first accepted ── */
  useEffect(() => {
    const hasAccepted = trades.some((t) => t.status === "accepted")
    if (hasAccepted && !prevAcceptedRef.current) {
      prevAcceptedRef.current = true
      const first = trades.find((t) => t.status === "accepted")
      setFirstAcceptedName(first?.businessName || first?.name || "A tradesperson")
      setPhase("first_accepted")
      tryPlaySound()
      if (trades.filter((t) => t.status === "accepted").length > 1) setPhase("all_responded")
    }
  }, [trades])

  const tryPlaySound = () => {
    try { new Audio("/sounds/success.mp3").play().catch(() => {}) } catch {}
  }

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
      jobId:       job.id,
      jobTitle:    job.title,
      tradesCount: trades.length,
      phase,
    })
    router.push("/")
  }

  const handleExpandRadius = () => { triggerExpand() }

  const handleNotifyMe = async () => {
    setNotifyRequested(true)
    try {
      await supabase.from("jobs").update({ notify_when_available: true }).eq("id", job.id)
    } catch {}
    // Show confirmation briefly, then return to main page
    setTimeout(() => router.push("/"), 1500)
  }

  const handleCancelRequest = async () => {
    try { await supabase.from("jobs").update({ is_active: false }).eq("id", job.id) } catch {}
    router.push("/dashboard")
  }

  const handleContactMore = () => {
    if (phase !== "expanding") triggerExpand()
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  /* ── poll for responses ── */
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}/urgent-responses`, { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      if (data.notifiedCount) setNotifiedCount(data.notifiedCount)
      if (data.responses?.length > 0) {
        const now = Date.now()
        setTrades((prev) => {
          const incoming: Trade[] = data.responses.map((r: any, i: number): Trade => ({
            id:            r.id,
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
            addedAt:       now + i * 150,
          }))
          const ids    = new Set(prev.map((t) => t.id))
          return [...prev, ...incoming.filter((t) => !ids.has(t.id))]
        })
        if (data.responses.length > 1) setPhase("all_responded")
      }
    } catch {}
  }, [job.id])

  useEffect(() => {
    poll()
    const iv = setInterval(poll, 5000)
    return () => clearInterval(iv)
  }, [poll])

  useEffect(() => {
    const channel = supabase
      .channel(`finding-trades-${job.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "job_applications", filter: `job_id=eq.${job.id}`,
      }, poll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [job.id, supabase, poll])

  const contact = (trade: Trade, method: "call" | "message") => {
    if (method === "message") router.push(`/messages?to=${trade.id}&job=${job.id}`)
    if (method === "call" && trade.phone) window.location.href = `tel:${trade.phone}`
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* NO TRADES SCREEN                                                    */
  /* ─────────────────────────────────────────────────────────────────── */
  if (phase === "no_trades") {
    const atMaxRadius = radiusMiles >= 25

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-hidden">

        {/* Header */}
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

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center overflow-y-auto">

          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 animate-pop-in">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>

          <h2
            className="text-xl font-bold text-white mb-2 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            No {job.title.toLowerCase()}s available nearby
          </h2>
          <p
            className="text-sm text-slate-400 mb-8 max-w-xs animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            You can still post your job and receive replies when trades become available in your area.
          </p>

          {/* Options */}
          <div
            className="w-full max-w-sm space-y-3 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >

            {/* 🟠 Post Job & Wait */}
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white transition-all duration-200 active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Post Job &amp; Wait for Replies</p>
                <p className="text-xs text-orange-100/80 font-normal mt-0.5">
                  Your job stays live — trades will find you
                </p>
              </div>
            </button>

            {/* ⚪ Expand Search Radius */}
            {!atMaxRadius ? (
              <button
                onClick={handleExpandRadius}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-600/60 transition-all duration-200 active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Expand Search Radius</p>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Look up to {Math.min(radiusMiles * 2, 25)} miles from your location
                  </p>
                </div>
              </button>
            ) : (
              <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700/40 opacity-50 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-500 text-sm leading-tight">
                    Already at maximum radius
                  </p>
                  <p className="text-xs text-slate-600 font-normal mt-0.5">Searching up to 25 miles</p>
                </div>
              </div>
            )}

            {/* ⚪ Notify me */}
            <button
              onClick={handleNotifyMe}
              disabled={notifyRequested}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 active:scale-[0.98] text-left ${
                notifyRequested
                  ? "bg-emerald-500/10 border border-emerald-500/30 cursor-default"
                  : "bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600/60"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                notifyRequested ? "bg-emerald-500/20" : "bg-slate-700/80"
              }`}>
                <Bell className={`w-5 h-5 ${notifyRequested ? "text-emerald-400" : "text-slate-300"}`} />
              </div>
              <div>
                {notifyRequested ? (
                  <>
                    <p className="font-semibold text-emerald-400 text-sm leading-tight animate-pop-in">
                      ✓ We'll notify you
                    </p>
                    <p className="text-xs text-emerald-400/70 font-normal mt-0.5">
                      Alert when a trade becomes available
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-white text-sm leading-tight">
                      Notify me when available
                    </p>
                    <p className="text-xs text-slate-400 font-normal mt-0.5">
                      Get a notification when a trade opens up
                    </p>
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
  /* STATUS BANNER CONFIG (only for non-no_trades phases)               */
  /* ─────────────────────────────────────────────────────────────────── */
  const banners: Record<SearchingPhase, {
    bg: string
    icon: React.ReactNode
    title: React.ReactNode
    sub: React.ReactNode
    right?: React.ReactNode
  }> = {
    searching: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      icon: (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      ),
      title: <span className="text-sm font-semibold text-emerald-300">Finding available trades near you…</span>,
      sub:   <span className="text-xs text-emerald-400/80">We're contacting the closest professionals.</span>,
      right: <span className="text-xs text-emerald-400/60 flex-shrink-0 hidden sm:block">Replies in 2–5 min</span>,
    },
    sent: {
      bg: "bg-blue-500/10 border-blue-500/20",
      icon: <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />,
      title: <span className="text-sm font-semibold text-blue-300">Request sent to {notifiedCount || "3"} nearby trades</span>,
      sub:   <span className="text-xs text-blue-400/80">Waiting for responses…</span>,
    },
    first_accepted: {
      bg: "bg-emerald-500/15 border-emerald-500/30",
      icon: <PartyPopper className="w-4 h-4 text-emerald-300 flex-shrink-0" />,
      title: <span className="text-sm font-semibold text-emerald-200">🎉 {firstAcceptedName} is ready to help!</span>,
      sub:   <span className="text-xs text-emerald-400/80">You can still wait for other responses.</span>,
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
      title: <span className="text-sm font-semibold text-emerald-200">{trades.length} trade{trades.length !== 1 ? "s" : ""} responded!</span>,
      sub:   <span className="text-xs text-emerald-400/80">Choose the best fit below.</span>,
    },
  }

  const banner = banners[phase as SearchingPhase]

  /* ─────────────────────────────────────────────────────────────────── */
  /* TRADE CARD                                                          */
  /* ─────────────────────────────────────────────────────────────────── */
  const TradeCard = ({ trade, index }: { trade: Trade; index: number }) => (
    <div
      className={`animate-fade-in-up p-3 rounded-2xl border transition-all duration-500 ${
        trade.status === "accepted"
          ? "bg-emerald-500/12 border-emerald-500/35 shadow-sm shadow-emerald-500/10"
          : trade.status === "declined"
          ? "bg-slate-700/15 border-slate-600/20 opacity-40"
          : "bg-slate-700/35 border-slate-600/30"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 transition-all duration-500 ${
          trade.status === "accepted" ? "ring-emerald-500/50" : "ring-slate-600/40"
        } bg-slate-600`}>
          {trade.avatarUrl
            ? <img src={trade.avatarUrl} alt={trade.name} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-slate-200">{trade.name.charAt(0).toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white truncate">{trade.businessName || trade.name}</p>
            {trade.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {trade.rating.toFixed(1)}
              <span className="text-slate-500 ml-0.5">({trade.reviewCount})</span>
            </span>
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {trade.distanceMiles.toFixed(1)} mi
            </span>
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
                <span className="text-xs text-emerald-400 font-semibold">Accepted — Ready to chat</span>
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
      {trade.status === "accepted" && (
        <div className="flex gap-2 mt-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <button
            onClick={() => contact(trade, "message")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Start Chat
          </button>
          {trade.phone ? (
            <button
              onClick={() => contact(trade, "call")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call Now
            </button>
          ) : (
            <button
              onClick={() => router.push(`/profile/${trade.id}`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
            >
              View Profile
            </button>
          )}
        </div>
      )}
    </div>
  )

  /* ─────────────────────────────────────────────────────────────────── */
  /* SKELETON CARD                                                       */
  /* ─────────────────────────────────────────────────────────────────── */
  const SkeletonCard = ({ index }: { index: number }) => (
    <div
      className="animate-fade-in-up p-3 rounded-2xl border border-slate-600/25 bg-slate-700/25"
      style={{ animationDelay: `${index * 100}ms` }}
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

  /* ─────────────────────────────────────────────────────────────────── */
  /* MAIN RENDER                                                         */
  /* ─────────────────────────────────────────────────────────────────── */
  const skeletonCount = Math.max(0, 3 + expandSlots - trades.length)

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
            Finding Available Trades
          </p>
          <p className="text-xs text-slate-400">{job.title} · {radiusMiles} mi radius</p>
        </div>

        {/* Minimize — keeps searching, shows sticky bar on all pages */}
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
        key={phase}
        className={`animate-fade-in flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0 transition-colors duration-500 ${banner.bg}`}
        style={{ borderColor: "inherit" }}
      >
        {banner.icon}
        <div className="flex-1 min-w-0">
          <div>{banner.title}</div>
          <div>{banner.sub}</div>
        </div>
        {banner.right}
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* MAP */}
        <div className="h-[45vh] md:h-auto md:flex-1 relative flex-shrink-0 overflow-hidden">
          <FindingTradesMap
            lat={lat}
            lon={lon}
            searchRadiusMiles={radiusMiles}
            isExpanding={isExpanding}
            trades={trades.map((t) => ({
              id: t.id,
              name: t.businessName || t.name,
              distanceMiles: t.distanceMiles,
              status: t.status,
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
              <span className="text-sm font-semibold text-white">Contacted Trades</span>
              <span className="ml-auto text-xs text-slate-400">
                {notifiedCount ? `${notifiedCount} alerted` : "Searching…"}
              </span>
            </div>

            {trades.map((t, i) => <TradeCard key={t.id} trade={t} index={i} />)}
            {Array.from({ length: skeletonCount }, (_, i) => (
              <SkeletonCard key={`sk-${i}`} index={i} />
            ))}

            {phase === "expanding" && (
              <p className="animate-fade-in text-xs text-center text-amber-400/70 pt-1">
                Adding more tradespeople from a wider area…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ───────────────────────────────────── */}
      <div className="flex items-center bg-slate-800/98 border-t border-slate-700/60 flex-shrink-0 px-3 py-2 gap-2">
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
      </div>

    </div>
  )
}
