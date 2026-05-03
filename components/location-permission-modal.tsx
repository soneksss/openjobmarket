"use client"

import { MapPin, X } from "lucide-react"
import { type PermState } from "@/hooks/use-location-permission"

interface LocationPermissionModalProps {
  open: boolean
  /** Short context sentence — e.g. "to find tradespeople near you" */
  reason?: string
  permState?: PermState
  onAllow: () => void
  onDeny:  () => void
}

/**
 * LocationPermissionModal
 *
 * Shown BEFORE the OS permission dialog when permState === "prompt".
 * Explains WHY location is needed and lets the user opt out cleanly.
 *
 * Also renders a "denied" state with a retry / settings prompt when
 * permState === "denied" and the modal is opened explicitly (e.g. retry tap).
 */
export function LocationPermissionModal({
  open,
  reason = "to show results near you",
  permState = "prompt",
  onAllow,
  onDeny,
}: LocationPermissionModalProps) {
  if (!open) return null

  const isDenied = permState === "denied"

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onDeny() }}
    >
      {/* Sheet */}
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent" />

        {/* Content */}
        <div className="px-5 pt-5 pb-6">
          {/* Dismiss */}
          <button
            onClick={onDeny}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isDenied ? "bg-red-500/15" : "bg-emerald-500/15"
          }`}>
            <MapPin className={`w-6 h-6 ${isDenied ? "text-red-400" : "text-emerald-400"}`} />
          </div>

          {/* Heading */}
          <h2 className="text-base font-semibold text-white text-center mb-1">
            {isDenied ? "Location access blocked" : "Allow location access?"}
          </h2>

          {/* Body */}
          {isDenied ? (
            <p className="text-sm text-slate-400 text-center leading-relaxed mb-5">
              Location is blocked. To enable it, open your device settings and allow location
              for this app, then try again.
            </p>
          ) : (
            <p className="text-sm text-slate-400 text-center leading-relaxed mb-5">
              OpenJobMarket needs your location {reason}.
              <br />
              <span className="text-slate-500 text-xs">Your location is never stored without your consent.</span>
            </p>
          )}

          {/* Bullet points (only for prompt state) */}
          {!isDenied && (
            <ul className="space-y-1.5 mb-5">
              {[
                "Find tradespeople closest to you",
                "Show accurate distances in results",
                "Centre the map on your area",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* Buttons */}
          {isDenied ? (
            <div className="space-y-2">
              <button
                onClick={onAllow}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
              >
                Try again
              </button>
              <button
                onClick={onDeny}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-sm transition-colors"
              >
                Continue without location
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={onAllow}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
              >
                Allow location
              </button>
              <button
                onClick={onDeny}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-sm transition-colors"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
