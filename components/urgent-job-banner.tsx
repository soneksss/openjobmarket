"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { Zap, X } from "lucide-react"

/* ─────────────────────────────────────────────────────────────────── */
/* Public types                                                        */
/* ─────────────────────────────────────────────────────────────────── */
export interface UrgentJobAlert {
  id: string
  title: string           // "Urgent plumbing job nearby"
  distanceMiles: number
  urgencyLabel: string    // "Needs help today"
  maxApplicants: number
  jobUrl?: string
}

export interface UrgentJobBannerProps {
  alert: UrgentJobAlert
  /** Component only renders when this equals "available" */
  tradeStatus?: string
  /** Number shown in the collapsed pill */
  pendingCount?: number
  onView?: (id: string) => void
  onDismiss?: (id: string) => void
}

/* ─────────────────────────────────────────────────────────────────── */
/* Constants                                                           */
/* ─────────────────────────────────────────────────────────────────── */
const AUTO_MS        = 12_000   // auto-dismiss after 12 s
const ANIM_MS        = 250      // slide animation duration
const SWIPE_THRESH   = 40       // px upward swipe to dismiss

/* ─────────────────────────────────────────────────────────────────── */
/* Haptic helper (Vibration API — no-op on unsupported platforms)      */
/* ─────────────────────────────────────────────────────────────────── */
function hapticLight() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10)
    }
  } catch {}
}

/* ─────────────────────────────────────────────────────────────────── */
/* Inner component (exported as memo below)                            */
/* ─────────────────────────────────────────────────────────────────── */
function UrgentJobBannerInner({
  alert,
  tradeStatus = "available",
  pendingCount = 1,
  onView,
  onDismiss,
}: UrgentJobBannerProps) {
  // ── state ──────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<"hidden" | "in" | "out" | "pill">("hidden")
  const [countdownKey, setCountdownKey] = useState(0)   // resets countdown bar

  // ── refs ────────────────────────────────────────────────────────────
  const bannerRef    = useRef<HTMLDivElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartY  = useRef(0)
  const touchDeltaY  = useRef(0)
  const dismissRef   = useRef<() => void>(() => {})   // always-current dismiss fn

  const isAvailable = tradeStatus === "available"

  // ── helpers ─────────────────────────────────────────────────────────
  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const startTimer = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => dismissRef.current(), AUTO_MS)
  }, [])

  // ── dismiss logic ────────────────────────────────────────────────────
  // Keep ref up-to-date every render so startTimer's closure is safe
  dismissRef.current = () => {
    setPhase("out")
    clearTimer()
    setTimeout(() => setPhase("pill"), ANIM_MS + 20)
    onDismiss?.(alert.id)
  }

  // ── show on mount (only if available) ───────────────────────────────
  useEffect(() => {
    if (!isAvailable) return
    // Inject keyframes once
    if (!document.getElementById("ujb-kf")) {
      const s = document.createElement("style")
      s.id = "ujb-kf"
      s.textContent = `
        @keyframes ujb-countdown {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
        @keyframes ujb-pill {
          0%   { opacity: 0; transform: scale(0.75) translateY(-6px); }
          65%  { transform: scale(1.06) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `
      document.head.appendChild(s)
    }
    const t = setTimeout(() => {
      setPhase("in")
      hapticLight()
      startTimer()
    }, 160)
    return () => {
      clearTimeout(t)
      clearTimer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvailable])

  // ── touch handlers (swipe-up to dismiss) ────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchDeltaY.current = 0
    if (bannerRef.current) {
      bannerRef.current.style.transition = "opacity 0.12s"
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta >= 0) return   // only allow upward swipe
    touchDeltaY.current = delta
    const el = bannerRef.current
    if (!el) return
    el.style.transform = `translateY(${delta}px)`
    el.style.opacity   = String(Math.max(0, 1 + delta / 90))
  }, [])

  const onTouchEnd = useCallback(() => {
    if (touchDeltaY.current < -SWIPE_THRESH) {
      dismissRef.current()
    } else {
      // Spring back
      const el = bannerRef.current
      if (el) {
        el.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s`
        el.style.transform  = "translateY(0)"
        el.style.opacity    = "1"
      }
    }
    touchDeltaY.current = 0
  }, [])

  // ── pill → restore banner ────────────────────────────────────────────
  const handlePillClick = useCallback(() => {
    setPhase("in")
    setCountdownKey((k) => k + 1)
    hapticLight()
    startTimer()
  }, [startTimer])

  // ── view handler ─────────────────────────────────────────────────────
  const handleView = useCallback(() => {
    clearTimer()
    onView?.(alert.id)
    if (alert.jobUrl) window.location.href = alert.jobUrl
  }, [alert.id, alert.jobUrl, onView])

  // ── derived animation state ──────────────────────────────────────────
  const visible = phase === "in" || phase === "out"
  const translateY =
    phase === "in"     ? "translateY(0)"
    : /* out / hidden */ "translateY(-115%)"

  const transition =
    phase === "out"
      ? `transform ${ANIM_MS}ms cubic-bezier(0.4,0,1,1)`   // fast snap out
      : `transform ${ANIM_MS}ms cubic-bezier(0.34,1.56,0.64,1)`  // spring in

  // ── don't render at all if not available ────────────────────────────
  if (!isAvailable) return null

  return (
    <>
      {/* ────────────────────────────────── BANNER ── */}
      <div
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[300] px-2.5 pt-1.5"
        style={{ pointerEvents: visible ? "auto" : "none" }}
      >
        <div
          ref={bannerRef}
          role="alert"
          aria-label={`Urgent job: ${alert.title}`}
          onClick={handleView}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform: translateY,
            transition,
            willChange: "transform",
            borderRadius: "0 0 16px 16px",
            overflow: "hidden",
            cursor: "pointer",
            userSelect: "none",
          }}
          className="
            bg-gradient-to-b from-[#FFF7EE] to-[#FFE5C8]
            dark:from-[#2c0e00] dark:to-[#3e1600]
            border border-orange-200/70 dark:border-orange-700/40
            shadow-[0_8px_32px_rgba(251,146,60,0.22),0_2px_8px_rgba(0,0,0,0.08)]
            dark:shadow-[0_8px_32px_rgba(251,146,60,0.15),0_2px_10px_rgba(0,0,0,0.4)]
          "
        >
          {/* ── Content row ── */}
          <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">

            {/* Left — lightning badge */}
            <div
              className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: "0 2px 10px rgba(249,115,22,0.45)" }}
            >
              <Zap className="w-[18px] h-[18px] text-white fill-white" />
            </div>

            {/* Center — text */}
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight text-orange-950 dark:text-orange-50 truncate"
                 style={{ fontSize: 16 }}>
                {alert.title}
              </p>
              <p className="leading-tight text-orange-800 dark:text-orange-200 mt-[3px] truncate"
                 style={{ fontSize: 14 }}>
                {alert.distanceMiles.toFixed(1)} miles&nbsp;·&nbsp;{alert.urgencyLabel}
              </p>
              <p className="leading-tight text-orange-500/80 dark:text-orange-300/70 mt-[2px]"
                 style={{ fontSize: 12 }}>
                Up to {alert.maxApplicants} trades can apply
              </p>
            </div>

            {/* Right — View + dismiss */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                role="button"
                onClick={(e) => { e.stopPropagation(); handleView() }}
                className="
                  flex items-center justify-center rounded-full
                  bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
                  text-white font-semibold text-sm
                  transition-colors select-none
                "
                style={{ height: 36, paddingInline: 16 }}
                aria-label="View job"
              >
                View
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissRef.current() }}
                className="
                  w-7 h-7 rounded-full flex items-center justify-center
                  text-orange-400 dark:text-orange-300
                  hover:bg-orange-200/60 dark:hover:bg-orange-800/50
                  transition-colors
                "
                aria-label="Dismiss notification"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>
          </div>

          {/* ── Countdown bar ── */}
          <div className="h-[3px] bg-orange-100 dark:bg-orange-900/50">
            <div
              key={countdownKey}
              className="h-full bg-orange-400/70 dark:bg-orange-500/60 origin-left"
              style={{ animation: `ujb-countdown ${AUTO_MS}ms linear forwards` }}
            />
          </div>
        </div>
      </div>

      {/* ────────────────────────────────── PILL ── */}
      {phase === "pill" && (
        <button
          onClick={handlePillClick}
          aria-label={`${pendingCount} urgent job${pendingCount !== 1 ? "s" : ""} available`}
          className="
            fixed top-[4.5rem] right-3 z-[300]
            flex items-center gap-1.5 px-3 py-2
            rounded-full
            bg-orange-500 hover:bg-orange-400 active:scale-95
            text-white font-semibold text-sm
            transition-all select-none
          "
          style={{
            boxShadow: "0 4px 16px rgba(249,115,22,0.45)",
            animation: "ujb-pill 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <Zap className="w-3.5 h-3.5 fill-white flex-shrink-0" />
          <span>⚡ {pendingCount} Urgent Job{pendingCount !== 1 ? "s" : ""}</span>
        </button>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Exported — memo prevents re-renders on unrelated parent state changes */
/* ─────────────────────────────────────────────────────────────────── */
export const UrgentJobBanner = memo(UrgentJobBannerInner)
