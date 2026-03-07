"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Sparkles } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
type ItemType = "activity" | "promo"

interface TickerItem {
  type: ItemType
  text: string
}

// ─── Real-activity fallbacks ──────────────────────────────────────────────────
// Used when no live DB events are passed in yet.
const FALLBACK_ACTIVITIES: TickerItem[] = [
  { type: "activity", text: "Electrician job completed in Portsmouth" },
  { type: "activity", text: "Boiler repair booked in Havant" },
  { type: "activity", text: "Garden fence installed in Waterlooville" },
  { type: "activity", text: "Plumber hired in Southsea" },
  { type: "activity", text: "Roof repair completed in Emsworth" },
  { type: "activity", text: "Kitchen rewire finished in Hayling Island" },
  { type: "activity", text: "Bathroom tiles fitted in Chichester" },
  { type: "activity", text: "Central heating service done in Rowlands Castle" },
  { type: "activity", text: "Painter & decorator booked in Fareham" },
  { type: "activity", text: "Damp proofing completed in Gosport" },
  { type: "activity", text: "Decking installed in West Wittering" },
  { type: "activity", text: "Plastering job finished in Leigh Park" },
  { type: "activity", text: "Bathroom renovation booked in Bedhampton" },
  { type: "activity", text: "Electrical inspection done in Eastney" },
  { type: "activity", text: "Landscaping completed in Port Solent" },
]


// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Random integer in [min, max] inclusive. */
function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Builds the rotation pool:
 *
 * • 0 real items  → 100 % FALLBACK_ACTIVITIES (ticker never feels empty).
 * • N real items  → 70 % real + 30 % FALLBACK_ACTIVITIES, shuffled together.
 *                   Promos are only shown when explicitly passed as real items.
 */
function buildPool(realItems: TickerItem[]): TickerItem[] {
  if (realItems.length === 0) {
    return shuffle(FALLBACK_ACTIVITIES)
  }

  // How many fallback slots to fill the 30 % quota.
  // At least 1 so there is always variety; capped by what's available.
  const fallbackCount = Math.min(
    Math.max(1, Math.round(realItems.length * 30 / 70)),
    FALLBACK_ACTIVITIES.length
  )
  const fallbacks = shuffle(FALLBACK_ACTIVITIES).slice(0, fallbackCount)

  return shuffle([...realItems, ...fallbacks])
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ActivityTickerItem {
  type: ItemType
  text: string
}

interface ActivityTickerCardProps {
  /**
   * Live activity/promo items from a parent query.
   * When absent or empty the component uses built-in fallback data.
   */
  items?: ActivityTickerItem[]
  /**
   * Min/max milliseconds between transitions.
   * Each display duration is independently randomised in this range.
   * Defaults: 10 000 – 20 000 ms.
   */
  minIntervalMs?: number
  maxIntervalMs?: number
  className?: string
  /** Render as a single subtle text line instead of a card. */
  inline?: boolean
  /** Override the text className in inline mode. Defaults to "text-base sm:text-lg text-slate-400". */
  textClassName?: string
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ActivityTickerCard({
  items,
  minIntervalMs = 10_000,
  maxIntervalMs = 20_000,
  className = "",
  inline = false,
  textClassName,
}: ActivityTickerCardProps) {
  const [mounted, setMounted] = useState(false)
  const [pool, setPool]       = useState<TickerItem[]>([])
  const [index, setIndex]     = useState(0)
  const [phase, setPhase]     = useState<"visible" | "leaving" | "entering">("visible")

  // Build the pool on the client only — Math.random() must not run during SSR
  useEffect(() => {
    setPool(buildPool(items && items.length > 0 ? items : []))
    setMounted(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted || pool.length === 0) return

    let timeoutId: ReturnType<typeof setTimeout>

    function scheduleNext() {
      const delay = randBetween(minIntervalMs, maxIntervalMs)
      timeoutId = setTimeout(() => {
        // Fade out
        setPhase("leaving")
        setTimeout(() => {
          // Swap item + fade in
          setIndex((i) => (i + 1) % pool.length)
          setPhase("entering")
          setTimeout(() => {
            setPhase("visible")
            scheduleNext() // queue the next transition with a fresh random delay
          }, 300)
        }, 300)
      }, delay)
    }

    scheduleNext()
    return () => clearTimeout(timeoutId)
  }, [mounted, pool, minIntervalMs, maxIntervalMs])

  // Render nothing on the server — avoids hydration mismatch
  if (!mounted) return null

  const current = pool[index]
  const isPromo = current?.type === "promo"

  const fadeStyle: React.CSSProperties = {
    transition: "opacity 300ms ease",
    opacity: phase === "visible" ? 1 : 0,
  }

  // ── Inline text mode ──────────────────────────────────────────────────────
  if (inline) {
    return (
      <div className={`flex items-center justify-center gap-1.5 ${className}`}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <span style={fadeStyle} className={textClassName ?? "text-base sm:text-lg text-slate-400 truncate"}>
          {current?.text}
        </span>
      </div>
    )
  }

  // ── Full card mode ────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    transition: "opacity 300ms ease, transform 300ms ease",
    opacity:   phase === "visible" ? 1 : 0,
    transform:
      phase === "leaving"  ? "translateY(-8px)" :
      phase === "entering" ? "translateY(8px)"  : "translateY(0)",
  }

  return (
    <div
      className={`rounded-xl border border-emerald-500/20 bg-slate-800/70 backdrop-blur-sm px-4 py-3 ${className}`}
      style={{ minHeight: 90 }}
    >
      {/* Header */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-2.5 flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Recent Activity
      </p>

      {/* Ticker body */}
      <div className="overflow-hidden" style={{ height: 40 }}>
        <div style={cardStyle} className="flex items-start gap-2">
          {isPromo ? (
            <Sparkles className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          )}
          <span
            className={`text-sm leading-snug line-clamp-2 ${
              isPromo ? "text-slate-300" : "text-slate-200"
            }`}
          >
            {current?.text}
          </span>
        </div>
      </div>
    </div>
  )
}
