"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, MapPin, Phone, MessageCircle, Star, Clock,
  CheckCircle2, Search, AlertCircle, ChevronRight, X, Zap,
  Users, ArrowRight, RefreshCw, WifiOff, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/client"

/* ─── Types ────────────────────────────────────────────────────── */
type UrgencyType  = "asap" | "today"
type SearchState  = "active_search" | "response_received" | "auto_downgraded" | "background_search"

interface Tradesperson {
  id: string
  name: string
  business_name?: string
  avatar_url?: string
  rating: number
  review_count: number
  distance_miles: number
  response_time?: string
  verified: boolean
  phone?: string
}

interface UrgentJobSearchProps {
  jobId: string
  jobTitle: string
  urgencyType: UrgencyType
  initialRadius: number
  location: string
  onClose?: () => void
  onConvertToStandard?: () => void
}

/* ─── Timing constants ─────────────────────────────────────────── */
const TIMING = {
  asap: {
    initialSearchSeconds: 600,   // 10 min
    pollIntervalMs:       3_000,
    autoDowngradeToToday: true,
  },
  today: {
    initialSearchSeconds: 7_200, // 2 hr
    pollIntervalMs:       10_000,
    autoDowngradeToToday: false,
  },
} as const

/* ─── localStorage key for timer persistence ───────────────────── */
const timerKey = (jobId: string) => `ojm_ust_${jobId}`

interface PersistedTimer {
  startedAt:              number  // epoch ms when timer started
  initialDurationSeconds: number
  urgencyType:            UrgencyType
  searchState:            SearchState
}

/* ─── Backoff schedule: 0→base, 1→2x, 2→4x … capped at 30 s ──── */
function backoffMs(fails: number, base: number) {
  if (fails <= 0) return 0
  return Math.min(base * Math.pow(2, fails - 1), 30_000)
}

/* ═══════════════════════════════════════════════════════════════ */
export function UrgentJobSearch({
  jobId,
  jobTitle,
  urgencyType: initialUrgencyType,
  initialRadius,
  location,
  onClose,
  onConvertToStandard,
}: UrgentJobSearchProps) {
  const supabase = createClient()

  /* ── Core state ─────────────────────────────────────────────── */
  const [searchState,  setSearchState]  = useState<SearchState>("active_search")
  const [urgencyType,  setUrgencyType]  = useState<UrgencyType>(initialUrgencyType)
  const [secsLeft,     setSecsLeft]     = useState<number>(TIMING[initialUrgencyType].initialSearchSeconds)
  const [currentRadius, setCurrentRadius] = useState(initialRadius)
  const [tradespeople, setTradespeople] = useState<Tradesperson[]>([])
  const [notifiedCount, setNotifiedCount] = useState(0)
  const [isDowngrading, setIsDowngrading] = useState(false)

  /* ── Recovery / resilience state ───────────────────────────── */
  const [isOffline,      setIsOffline]      = useState(false)
  const [consecFails,    setConsecFails]    = useState(0)
  const [stuckSecs,      setStuckSecs]      = useState(0)
  const [timerRestored,  setTimerRestored]  = useState(false)
  const [showCancelConf, setShowCancelConf] = useState(false)

  /* ── Refs ───────────────────────────────────────────────────── */
  const pollTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const isOfflineRef     = useRef(false)
  const consecFailsRef   = useRef(0)
  const searchStateRef   = useRef<SearchState>("active_search")
  const pollRef          = useRef<(() => Promise<void>) | null>(null)  // forward-ref to avoid stale closure

  searchStateRef.current = searchState
  consecFailsRef.current = consecFails

  const timing = TIMING[urgencyType]

  /* ─────────────────────────────────────────────────────────── */
  /* 1. TIMER RESTORATION — read localStorage on first mount     */
  /* ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(timerKey(jobId))
      if (raw) {
        const saved: PersistedTimer = JSON.parse(raw)
        const elapsed    = Math.floor((Date.now() - saved.startedAt) / 1000)
        const remaining  = Math.max(0, saved.initialDurationSeconds - elapsed)

        if (remaining === 0) {
          // Timer ran out while the app was closed
          if (saved.urgencyType === "asap") {
            // Silently downgrade — don't trigger DB write again, just set local state
            setUrgencyType("today")
            setSearchState("auto_downgraded")
            setSecsLeft(TIMING.today.initialSearchSeconds)
          } else {
            setSearchState("background_search")
            setSecsLeft(() => 0)
          }
        } else {
          setSecsLeft(() => remaining)
          if (saved.urgencyType !== initialUrgencyType) setUrgencyType(saved.urgencyType)
          // Restore background state if that's where we left off
          if (saved.searchState === "background_search" ||
              saved.searchState === "response_received") {
            setSearchState(saved.searchState)
          }
        }
      }
    } catch {}
    setTimerRestored(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  /* ─────────────────────────────────────────────────────────── */
  /* 2. TIMER PERSISTENCE — write to localStorage on each tick   */
  /* ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!timerRestored) return
    try {
      const elapsed = TIMING[urgencyType].initialSearchSeconds - secsLeft
      const saved: PersistedTimer = {
        startedAt:              Date.now() - elapsed * 1_000,
        initialDurationSeconds: TIMING[urgencyType].initialSearchSeconds,
        urgencyType,
        searchState,
      }
      localStorage.setItem(timerKey(jobId), JSON.stringify(saved))
    } catch {}
  }, [secsLeft, urgencyType, searchState, jobId, timerRestored])

  /* ─────────────────────────────────────────────────────────── */
  /* 3. NETWORK STATE — offline banner + reconnect retry         */
  /* ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const goOffline = () => { isOfflineRef.current = true;  setIsOffline(true) }
    const goOnline  = () => {
      isOfflineRef.current = false
      setIsOffline(false)
      setConsecFails(0)
      consecFailsRef.current = 0
      // Immediate poll on reconnect
      pollRef.current?.()
    }
    if (!navigator.onLine) { isOfflineRef.current = true; setIsOffline(true) }
    window.addEventListener("offline", goOffline)
    window.addEventListener("online",  goOnline)
    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online",  goOnline)
    }
  }, [])

  /* ─────────────────────────────────────────────────────────── */
  /* 4. STUCK DETECTION — 3 min active_search with 0 notified   */
  /* ─────────────────────────────────────────────────────────── */
  const STUCK_THRESHOLD = 180

  useEffect(() => {
    if (searchState !== "active_search" || notifiedCount > 0 || tradespeople.length > 0) {
      setStuckSecs(0)
      return
    }
    const t = setInterval(() => setStuckSecs((s) => s + 1), 1_000)
    return () => clearInterval(t)
  }, [searchState, notifiedCount, tradespeople.length])

  const isStuck = stuckSecs >= STUCK_THRESHOLD

  /* ─────────────────────────────────────────────────────────── */
  /* Core: auto-downgrade ASAP → Today                           */
  /* ─────────────────────────────────────────────────────────── */
  const handleAutoDowngrade = useCallback(async () => {
    if (urgencyType !== "asap") return
    setIsDowngrading(true)
    try {
      await supabase.from("jobs").update({
        urgency_type:  "today",
        search_state:  "active_search",
      }).eq("id", jobId)
      setUrgencyType("today")
      setSearchState("auto_downgraded")
      setSecsLeft(TIMING.today.initialSearchSeconds)
      setCurrentRadius((r) => Math.min(r * 1.5, 25))
    } catch (err) {
      console.error("[UrgentJobSearch] Downgrade failed:", err)
    } finally {
      setIsDowngrading(false)
    }
  }, [jobId, urgencyType, supabase])

  /* ─────────────────────────────────────────────────────────── */
  /* Countdown ticker                                             */
  /* ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (searchState !== "active_search" && searchState !== "auto_downgraded") return
    if (countdownRef.current) clearInterval(countdownRef.current)

    countdownRef.current = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev <= 1) {
          if (urgencyType === "asap" && timing.autoDowngradeToToday) {
            handleAutoDowngrade()
          } else {
            setSearchState("background_search")
          }
          return 0
        }
        return prev - 1
      })
    }, 1_000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState, urgencyType])

  /* ─────────────────────────────────────────────────────────── */
  /* 5. POLLING with exponential backoff                          */
  /* ─────────────────────────────────────────────────────────── */
  const schedulePoll = useCallback((extraDelayMs = 0) => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    pollTimeoutRef.current = setTimeout(async () => {
      await pollRef.current?.()
      // Next poll delay: base interval + backoff for consecutive failures
      const fails = consecFailsRef.current
      const delay = backoffMs(fails, timing.pollIntervalMs)
      schedulePoll(delay)
    }, timing.pollIntervalMs + extraDelayMs)
  }, [timing.pollIntervalMs])

  const pollForResponses = useCallback(async () => {
    // Don't poll while offline or after search ended
    if (isOfflineRef.current) return
    const state = searchStateRef.current
    if (state === "background_search") return

    try {
      const res = await fetch(`/api/jobs/${jobId}/urgent-responses`, {
        credentials: "include",
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Auth lost — stop polling silently
          if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
          return
        }
        const next = consecFailsRef.current + 1
        setConsecFails(next)
        consecFailsRef.current = next
        return
      }

      // Success — reset fail counter
      setConsecFails(0)
      consecFailsRef.current = 0

      const data = await res.json()
      if (data.notifiedCount)  setNotifiedCount(data.notifiedCount)
      if (data.responses?.length > 0) {
        setTradespeople(data.responses)
        if (state !== "response_received") setSearchState("response_received")
      }
    } catch {
      const next = consecFailsRef.current + 1
      setConsecFails(next)
      consecFailsRef.current = next
    }
  }, [jobId])

  // Keep pollRef in sync with latest closure
  useEffect(() => { pollRef.current = pollForResponses }, [pollForResponses])

  // Start polling when state allows it
  useEffect(() => {
    if (searchState === "background_search") {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      return
    }
    pollForResponses()  // immediate first poll
    schedulePoll()
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState])

  // Clean up timer key when job is confirmed/cancelled
  const clearPersistedTimer = useCallback(() => {
    try { localStorage.removeItem(timerKey(jobId)) } catch {}
  }, [jobId])

  /* ─────────────────────────────────────────────────────────── */
  /* Action handlers                                              */
  /* ─────────────────────────────────────────────────────────── */
  const handleContact = (person: Tradesperson, method: "call" | "message") => {
    if (method === "call" && person.phone) {
      window.location.href = `tel:${person.phone}`
    } else {
      window.location.href = `/messages?to=${person.id}&job=${jobId}`
    }
  }

  const handleContinueInBackground = () => setSearchState("background_search")

  const handleResumeSearch = () => {
    // Restore a reasonable remaining time (up to 5 min for ASAP, 30 min for Today)
    const maxResume = urgencyType === "asap" ? 300 : 1_800
    setSecsLeft((s) => s > 0 ? s : maxResume as number)
    setSearchState("active_search")
    setStuckSecs(0)
  }

  const handleExpandRadius = async () => {
    const newRadius = Math.min(currentRadius * 2, 25)
    setCurrentRadius(newRadius)
    setStuckSecs(0)
    try {
      await supabase.from("jobs").update({ search_radius_miles: newRadius }).eq("id", jobId)
    } catch {}
  }

  const handleRetryPoll = () => {
    setConsecFails(0)
    consecFailsRef.current = 0
    pollForResponses()
    schedulePoll()
  }

  const handleConfirmCancel = () => {
    clearPersistedTimer()
    setShowCancelConf(false)
    onClose?.()
  }

  /* ─────────────────────────────────────────────────────────── */
  /* Time formatting                                              */
  /* ─────────────────────────────────────────────────────────── */
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}:${String(sec).padStart(2, "0")}`
    return `${sec}s`
  }

  /* ─────────────────────────────────────────────────────────── */
  /* Derived flags                                                */
  /* ─────────────────────────────────────────────────────────── */
  const isPollingDegraded = consecFails >= 3

  /* ═══════════════════════════════════════════════════════════ */
  /* RENDER                                                       */
  /* ═══════════════════════════════════════════════════════════ */
  const renderContent = () => {
    switch (searchState) {

      /* ── ACTIVE SEARCH ─────────────────────────────────────── */
      case "active_search":
        return (
          <div className="text-center space-y-5">
            {/* Radar animation */}
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-emerald-500/30 animate-ping" style={{ animationDelay: "200ms" }} />
              <div className="absolute inset-4 rounded-full bg-emerald-500/40 animate-ping" style={{ animationDelay: "400ms" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center">
                  {isOffline
                    ? <WifiOff className="w-7 h-7 text-white" />
                    : <Search className="w-7 h-7 text-white animate-pulse" />
                  }
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                {isOffline
                  ? "Waiting for internet connection…"
                  : isStuck
                  ? "No tradespeople found yet"
                  : urgencyType === "asap"
                  ? "Finding available tradespeople NOW…"
                  : "Searching for tradespeople today…"
                }
              </h2>
              <p className="text-slate-400 text-sm">
                {isOffline
                  ? "Your search is paused. It'll resume automatically when you reconnect."
                  : `Searching within ${currentRadius} miles of ${location}`
                }
              </p>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{notifiedCount}</div>
                <div className="text-xs text-slate-400">Alerted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{formatTime(secsLeft)}</div>
                <div className="text-xs text-slate-400">
                  {urgencyType === "asap" ? "ASAP window" : "Search window"}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-1000",
                  isOffline ? "bg-slate-500" : "bg-emerald-500"
                )}
                style={{ width: `${(1 - secsLeft / timing.initialSearchSeconds) * 100}%` }}
              />
            </div>

            <Badge className={cn(
              "text-xs px-3 py-1",
              urgencyType === "asap"
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            )}>
              <Zap className="w-3 h-3 mr-1" />
              {urgencyType === "asap" ? "ASAP — Emergency Priority" : "Today — Same Day"}
            </Badge>

            {/* Degraded poll warning */}
            {isPollingDegraded && !isOffline && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-amber-200 font-semibold mb-1">Having trouble connecting to the server</p>
                  <p className="text-xs text-amber-200/70 mb-2">Responses may be delayed. Your search is still live.</p>
                  <button
                    onClick={handleRetryPoll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry now
                  </button>
                </div>
              </div>
            )}

            {/* Stuck warning */}
            {isStuck && !isOffline && (
              <div className="flex items-start gap-2 bg-slate-700/50 border border-slate-600/50 rounded-xl p-3 text-left">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 font-semibold mb-0.5">No nearby tradespeople yet</p>
                  <p className="text-xs text-slate-400 mb-2">Try widening your radius or check back in a few minutes.</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleExpandRadius}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Expand to {Math.min(currentRadius * 2, 25)} mi
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      onClick={handleContinueInBackground}
                      className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      Run in background
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-center flex-wrap pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white text-xs"
                onClick={handleContinueInBackground}
              >
                Continue in background
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-red-400 text-xs"
                  onClick={() => setShowCancelConf(true)}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel search
                </Button>
              )}
            </div>
          </div>
        )

      /* ── RESPONSE RECEIVED ─────────────────────────────────── */
      case "response_received":
        return (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1">
                {tradespeople.length === 1
                  ? "A tradesperson is available!"
                  : `${tradespeople.length} tradespeople interested!`}
              </h2>
              <p className="text-slate-400 text-sm">
                {urgencyType === "asap"
                  ? "Contact them now to confirm the job"
                  : "Review their profiles and choose the best fit"}
              </p>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {tradespeople.map((person, i) => (
                <Card key={person.id} className={cn(
                  "p-4 bg-slate-700/50 border-slate-600",
                  urgencyType === "asap" && i === 0 && "ring-2 ring-emerald-500/50"
                )}>
                  {urgencyType === "asap" && i === 0 && (
                    <Badge className="mb-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      First to respond
                    </Badge>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {person.avatar_url
                        ? <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                        : <span className="text-lg font-semibold text-slate-300">{person.name.charAt(0)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate text-sm">
                          {person.business_name || person.name}
                        </h3>
                        {person.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {person.rating.toFixed(1)} ({person.review_count})
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {person.distance_miles.toFixed(1)} mi
                        </span>
                      </div>
                      {person.response_time && (
                        <p className="text-xs text-emerald-400 mt-0.5">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {person.response_time}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleContact(person, "call")}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <Phone className="w-3.5 h-3.5 mr-1.5" /> Call Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleContact(person, "message")}
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Message
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {urgencyType === "today" && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-slate-400 hover:text-white text-xs"
                onClick={() => setSearchState("active_search")}
              >
                Keep searching for more quotes
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        )

      /* ── AUTO DOWNGRADED ───────────────────────────────────── */
      case "auto_downgraded":
        return (
          <div className="text-center space-y-5">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/50 animate-spin" style={{ animationDuration: "8s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <RefreshCw className={cn("w-7 h-7 text-amber-400", isDowngrading && "animate-spin")} />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Expanding your search</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                We couldn't find someone immediately. We're widening the search
                and will notify you as soon as a tradesperson is available.
              </p>
            </div>

            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Now searching as "Today" priority
            </Badge>

            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-400">{notifiedCount}</div>
                <div className="text-xs text-slate-400">Alerted</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{formatTime(secsLeft)}</div>
                <div className="text-xs text-slate-400">Extended search</div>
              </div>
            </div>

            <div className="bg-amber-500/10 rounded-xl p-3 text-xs text-amber-200/80 text-left flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>Your job is now visible to more tradespeople in a wider area. We'll alert you the moment someone responds.</span>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={handleContinueInBackground}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue &amp; Get Notified
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white text-sm"
              >
                Stay on this screen
              </Button>
            </div>
          </div>
        )

      /* ── BACKGROUND SEARCH ─────────────────────────────────── */
      case "background_search":
        return (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-700 flex items-center justify-center">
              <Users className="w-8 h-8 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Search running in background</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Your job is live and visible to all tradespeople nearby.
                You'll receive a push notification the moment someone applies.
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-3">
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-lg font-bold text-emerald-400">{notifiedCount}</div>
                  <div className="text-xs text-slate-400">Alerted</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{tradespeople.length}</div>
                  <div className="text-xs text-slate-400">Interested</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-400">{currentRadius}mi</div>
                  <div className="text-xs text-slate-400">Radius</div>
                </div>
              </div>
            </div>

            <div className="text-left bg-slate-700/30 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-white">What happens next:</p>
              {[
                "Push notification when someone applies",
                "Review applicants in your dashboard",
                "Choose the best tradesperson for your job",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleResumeSearch}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resume Active Search
              </Button>
              <Button
                onClick={() => { clearPersistedTimer(); onClose?.() }}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white text-sm"
              >
                Go to Dashboard
              </Button>
              {onConvertToStandard && (
                <Button
                  onClick={onConvertToStandard}
                  variant="ghost"
                  className="w-full text-slate-500 hover:text-white text-xs"
                >
                  Convert to flexible timing
                </Button>
              )}
            </div>
          </div>
        )
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  /* Cancel confirmation overlay                                  */
  /* ─────────────────────────────────────────────────────────── */
  const CancelConfirmation = () => (
    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-6 z-10">
      <div className="text-center space-y-4 max-w-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white mb-1">Cancel this search?</h3>
          <p className="text-sm text-slate-400">
            Your job will be removed and tradespeople will stop receiving notifications.
            This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCancelConf(false)}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
          >
            Keep searching
          </Button>
          <Button
            onClick={handleConfirmCancel}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm"
          >
            Yes, cancel
          </Button>
        </div>
      </div>
    </div>
  )

  /* ─────────────────────────────────────────────────────────── */
  /* Main render                                                  */
  /* ─────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Offline banner — fixed at top of screen */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[300] flex items-center justify-center gap-2 bg-slate-800 border-b border-red-500/30 py-2 px-4 text-xs font-semibold text-red-300">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          No internet — search paused. Will resume automatically when you reconnect.
        </div>
      )}

      <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-800 border-slate-700 p-5 relative max-h-[90vh] overflow-y-auto">

          {/* Close button */}
          {onClose && (
            <button
              onClick={() => setShowCancelConf(true)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Job title */}
          <div className="text-center mb-5 pb-4 border-b border-slate-700">
            <Badge className="bg-slate-700 text-slate-300 text-xs">{jobTitle}</Badge>
          </div>

          {/* Dynamic content */}
          {renderContent()}

          {/* Cancel confirmation overlay */}
          {showCancelConf && <CancelConfirmation />}
        </Card>
      </div>
    </>
  )
}
