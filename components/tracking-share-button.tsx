"use client"

import { useState, useEffect, useRef } from "react"
import { Navigation, NavigationOff, Loader2 } from "lucide-react"

interface TrackingShareButtonProps {
  jobId: string
}

export function TrackingShareButton({ jobId }: TrackingShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const watchIdRef             = useRef<number | null>(null)
  const intervalRef            = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPosRef             = useRef<{ lat: number; lng: number } | null>(null)

  function sendLocation(lat: number, lng: number) {
    lastPosRef.current = { lat, lng }
    fetch(`/api/jobs/${jobId}/track`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ lat, lng }),
    }).catch(() => {})
  }

  function startSharing() {
    if (!navigator.geolocation) {
      setError("GPS not available on this device")
      return
    }
    setError(null)
    setSharing(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied")
          stopSharing()
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    // Heartbeat every 15 s in case watchPosition fires slowly
    intervalRef.current = setInterval(() => {
      if (lastPosRef.current) {
        sendLocation(lastPosRef.current.lat, lastPosRef.current.lng)
      }
    }, 15000)
  }

  function stopSharing() {
    setSharing(false)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Clean up on unmount
  useEffect(() => () => stopSharing(), [])

  return (
    <div className="flex flex-col gap-1.5">
      {sharing ? (
        <button
          onClick={stopSharing}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-colors"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Sharing location — tap to stop
        </button>
      ) : (
        <button
          onClick={startSharing}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Share my location
        </button>
      )}
      {error && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  )
}
