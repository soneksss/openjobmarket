"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft, Star, MapPin, CheckCircle2, Send,
  Users, X, ExternalLink, Clock, Zap,
} from "lucide-react"

const ManualTradeMap = dynamic(() => import("./manual-trade-map"), { ssr: false })
import type { TradePin } from "./manual-trade-map"

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                               */
/* ─────────────────────────────────────────────────────────────────── */
export interface Tradesperson {
  id: string
  type: "professional" | "company"
  name: string
  photoUrl: string | null
  lat: number
  lon: number
  location: string
  distanceMiles: number
  rating: number
  reviewCount: number
  skills: string[]
  title?: string        // professional job title
  industry?: string     // company industry
  availability?: string // professional availability field
  service24_7?: boolean // company
}

interface Job {
  id: string
  title: string
  location: string
  latitude: number | null
  longitude: number | null
  urgency_type: string | null
  industry: string | null
  category: string | null
}

interface ManualTradeSelectProps {
  job: Job
  tradespeople: Tradesperson[]
  userId: string
  posterName: string
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                             */
/* ─────────────────────────────────────────────────────────────────── */
const MAX = 5

function availabilityLabel(t: Tradesperson): { label: string; color: string } {
  if (t.service24_7) return { label: "Available 24/7", color: "text-emerald-400" }
  switch (t.availability) {
    case "available_now":   return { label: "Available Now",       color: "text-emerald-400" }
    case "available_week":  return { label: "Available This Week", color: "text-amber-400"   }
    case "available_month": return { label: "Available This Month", color: "text-blue-400"   }
    default:                return { label: "Availability Open",   color: "text-slate-400"   }
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Component                                                           */
/* ─────────────────────────────────────────────────────────────────── */
export function ManualTradeSelect({ job, tradespeople, userId, posterName }: ManualTradeSelectProps) {
  const router = useRouter()

  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [focused, setFocused]     = useState<string | null>(null)
  const [maxAlert, setMaxAlert]   = useState(false)
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const maxAlertTimer             = useRef<any>(null)

  const lat = job.latitude  ?? 51.5074
  const lon = job.longitude ?? -0.1278

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev); next.delete(id); return next
      }
      if (prev.size >= MAX) {
        setMaxAlert(true)
        clearTimeout(maxAlertTimer.current)
        maxAlertTimer.current = setTimeout(() => setMaxAlert(false), 3000)
        return prev
      }
      return new Set([...prev, id])
    })
  }, [])

  const selectedList = tradespeople.filter((t) => selected.has(t.id))

  const handleSend = async () => {
    if (selected.size === 0) return
    setSending(true)

    try {
      await fetch("/api/notifications/send-trade-job-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId:       job.id,
          jobTitle:    job.title,
          jobLat:      lat,
          jobLon:      lon,
          jobSkills:   [job.category || job.title, job.industry].filter(Boolean),
          posterName,
          urgencyType: job.urgency_type,
          jobIndustry: job.industry || null,
          jobService:  job.category || null,
        }),
      })
    } catch {}

    setSent(true)
    setTimeout(() => router.push(`/jobs/${job.id}/live`), 2000)
  }

  /* ── progress dots ── */
  const ProgressDots = () => (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: MAX }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < selected.size
              ? "w-3 h-3 bg-emerald-500 shadow-sm shadow-emerald-500/50"
              : "w-2.5 h-2.5 bg-slate-600"
          }`}
        />
      ))}
    </div>
  )

  /* ── trade card ── */
  const TradeCard = ({ t, index }: { t: Tradesperson; index: number }) => {
    const isSel  = selected.has(t.id)
    const avail  = availabilityLabel(t)

    return (
      <div
        id={`trade-${t.id}`}
        onClick={() => { toggle(t.id); setFocused(t.id) }}
        className={`animate-fade-in-up cursor-pointer rounded-2xl border transition-all duration-300 p-3 ${
          isSel
            ? "bg-emerald-500/12 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
            : focused === t.id
            ? "bg-slate-700/60 border-orange-500/40"
            : "bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50"
        }`}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 transition-all duration-300 ${
            isSel ? "ring-emerald-500" : "ring-slate-600/50"
          } bg-slate-600 flex items-center justify-center`}>
            {t.photoUrl
              ? <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
              : <span className="text-base font-bold text-slate-200">{t.name.charAt(0).toUpperCase()}</span>
            }
            {/* checkmark overlay */}
            {isSel && (
              <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center animate-pop-in">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white truncate">{t.name}</p>
              {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
            </div>
            {(t.title || t.industry) && (
              <p className="text-xs text-slate-400 truncate">{t.title || t.industry}</p>
            )}
            <div className="flex items-center gap-2.5 mt-0.5 text-xs text-slate-400">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {t.rating.toFixed(1)}
                <span className="text-slate-500 ml-0.5">({t.reviewCount})</span>
              </span>
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {t.distanceMiles.toFixed(1)} mi
              </span>
            </div>
            <p className={`text-xs mt-0.5 font-medium ${avail.color}`}>{avail.label}</p>
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2 mt-3">
          <a
            href={`/profile/${t.type}/${t.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-600/60 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View Profile
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); toggle(t.id) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              isSel
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-slate-600 hover:bg-slate-500 text-white"
            }`}
          >
            {isSel ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Selected</>
            ) : (
              <><Users className="w-3.5 h-3.5" /> Select</>
            )}
          </button>
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* SENDING OVERLAY                                                     */
  /* ─────────────────────────────────────────────────────────────────── */
  if (sending) {
    return (
      <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 w-full max-w-sm text-center space-y-5 animate-pop-in">
          {sent ? (
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center">
              <Send className="w-8 h-8 text-orange-400 animate-pulse" />
            </div>
          )}

          <div>
            <p className="text-lg font-bold text-white">
              {sent ? "Requests sent!" : `Sending to ${selected.size} selected trade${selected.size !== 1 ? "s" : ""}…`}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {sent ? "Redirecting to live tracking…" : "Notifying the tradespeople you chose."}
            </p>
          </div>

          {/* Selected names */}
          <div className="space-y-2">
            {selectedList.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-700/50 animate-fade-in-up`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {t.photoUrl
                    ? <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-slate-200">{t.name.charAt(0)}</span>
                  }
                </div>
                <span className="text-sm text-white font-medium">{t.name}</span>
                {sent && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto animate-pop-in" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* MAIN RENDER                                                         */
  /* ─────────────────────────────────────────────────────────────────── */
  const pins: TradePin[] = tradespeople.map((t) => ({
    id: t.id, name: t.name, lat: t.lat, lon: t.lon, type: t.type, photoUrl: t.photoUrl,
  }))

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-hidden">

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/60">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
              <Users className="w-4 h-4 text-orange-400" />
              Select up to 5 trades
            </p>
            <p className="text-xs text-slate-400">Choose professionals to send your job request</p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* ── SELECTION PROGRESS BAR ──────────────────────────── */}
        <div className="px-4 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold transition-colors duration-300 ${
              selected.size === MAX ? "text-emerald-400" : "text-white"
            }`}>
              {selected.size === MAX ? "✓" : selected.size} of {MAX} selected
            </span>
            <ProgressDots />
          </div>

          {/* inline max-alert */}
          {maxAlert && (
            <p className="text-xs text-amber-400 animate-fade-in">
              You can select up to 5 trades.
            </p>
          )}

          {!maxAlert && (
            <p className="text-xs text-slate-500">
              {tradespeople.length} available nearby
            </p>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* MAP — 40 vh on mobile, flex-1 on desktop */}
        <div className="h-[40vh] md:h-auto md:flex-1 flex-shrink-0 overflow-hidden">
          <ManualTradeMap
            lat={lat}
            lon={lon}
            tradespeople={pins}
            selected={selected}
            focused={focused}
            onToggle={(id) => { toggle(id); setFocused(id) }}
            onFocus={setFocused}
          />
        </div>

        {/* TRADE LIST PANEL */}
        <div className="
          flex-1 md:flex-none md:w-80
          overflow-y-auto
          bg-slate-800/98 md:bg-slate-800
          border-t md:border-t-0 md:border-l border-slate-700/60
          rounded-t-2xl md:rounded-none
        ">
          {/* drag handle on mobile */}
          <div className="flex justify-center pt-2 pb-1 md:hidden">
            <div className="w-8 h-1 rounded-full bg-slate-600" />
          </div>

          <div className="px-4 pb-24 pt-3 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-white">Available Tradespeople</span>
              <span className="ml-auto text-xs text-slate-400">{tradespeople.length} nearby</span>
            </div>

            {tradespeople.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No tradespeople found nearby.</p>
                <p className="text-xs text-slate-500 mt-1">Try expanding your search area.</p>
              </div>
            ) : (
              tradespeople.map((t, i) => <TradeCard key={t.id} t={t} index={i} />)
            )}
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR ────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-800/98 border-t border-slate-700/60 px-4 py-3 flex items-center gap-3">
        {/* Left: count */}
        <div className="flex-1">
          {selected.size > 0 ? (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold text-white">
                {selected.size} selected
              </p>
              <p className="text-xs text-slate-400 truncate">
                {selectedList.map((t) => t.name.split(" ")[0]).join(", ")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select at least 1 trade</p>
          )}
        </div>

        {/* Right: Send Request */}
        <button
          onClick={handleSend}
          disabled={selected.size === 0}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
            selected.size > 0
              ? "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30 scale-100"
              : "bg-slate-700 text-slate-500 cursor-not-allowed scale-95"
          }`}
        >
          <Send className="w-4 h-4" />
          Send Request
          {selected.size > 0 && (
            <span className="ml-1 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
              {selected.size}
            </span>
          )}
        </button>
      </div>

    </div>
  )
}
