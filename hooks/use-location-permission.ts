"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export type PermState = "granted" | "denied" | "prompt" | "unsupported"

/** Portsmouth city centre — default map centre when location unavailable */
export const PORTSMOUTH = { lat: 50.8058, lon: -1.0872 } as const

const LS_KEY = "ojm_geo_perm"

/** Read the cached permission state from localStorage (sync, no I/O). */
export function getCachedPermState(): PermState {
  if (typeof window === "undefined") return "prompt"
  return (localStorage.getItem(LS_KEY) as PermState) ?? "prompt"
}

/**
 * Lightweight check: is geolocation usable RIGHT NOW without prompting?
 * Returns true only when the cached state is "granted".
 * Safe to call outside React (no hooks).
 */
export function isLocationGranted(): boolean {
  return getCachedPermState() === "granted"
}

/**
 * useLocationPermission — manages the full geolocation permission lifecycle.
 *
 * Usage:
 *   const { permState, showModal, requestLocation, confirmModal, dismissModal } = useLocationPermission()
 *
 *   // trigger a location request — shows modal first if state is "prompt"
 *   requestLocation(
 *     (pos) => { ... use position ... },
 *     ()    => { ... use fallback ... }
 *   )
 *
 *   // render the modal (conditionally) and pass these handlers:
 *   <LocationPermissionModal open={showModal} onAllow={confirmModal} onDeny={dismissModal} ... />
 */
export function useLocationPermission() {
  const [permState, setPermState] = useState<PermState>(getCachedPermState)
  const [showModal, setShowModal]  = useState(false)

  // Pending callbacks stored via ref so they're stable across renders
  const pending = useRef<{
    onSuccess:  (pos: GeolocationPosition) => void
    onFallback: () => void
  } | null>(null)

  // ── Keep state in sync with the browser's Permissions API ────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return
    navigator.permissions.query({ name: "geolocation" }).then(result => {
      const s = result.state as PermState
      setPermState(s)
      localStorage.setItem(LS_KEY, s)
      result.addEventListener("change", () => {
        const ns = result.state as PermState
        setPermState(ns)
        localStorage.setItem(LS_KEY, ns)
      })
    }).catch(() => { /* permissions API unavailable */ })
  }, [])

  // ── Core geolocation call ─────────────────────────────────────────────────
  const doGetPosition = useCallback((
    onSuccess:  (pos: GeolocationPosition) => void,
    onFallback: () => void,
  ) => {
    if (!navigator.geolocation) { onFallback(); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermState("granted")
        localStorage.setItem(LS_KEY, "granted")
        onSuccess(pos)
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setPermState("denied")
          localStorage.setItem(LS_KEY, "denied")
        }
        onFallback()
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }, [])

  /**
   * Request location contextually:
   * - granted  → calls `getCurrentPosition` directly, no modal
   * - prompt   → shows explanation modal first
   * - denied / unsupported → calls `onFallback` immediately, no modal
   */
  const requestLocation = useCallback((
    onSuccess:  (pos: GeolocationPosition) => void,
    onFallback: () => void,
  ) => {
    if (permState === "granted") {
      doGetPosition(onSuccess, onFallback)
      return
    }
    if (permState === "denied" || permState === "unsupported") {
      onFallback()
      return
    }
    // "prompt" — show the explanation modal before the OS dialog
    pending.current = { onSuccess, onFallback }
    setShowModal(true)
  }, [permState, doGetPosition])

  /** User clicked "Allow" in the modal → trigger the OS permission dialog */
  const confirmModal = useCallback(() => {
    setShowModal(false)
    const cbs = pending.current
    pending.current = null
    if (cbs) doGetPosition(cbs.onSuccess, cbs.onFallback)
  }, [doGetPosition])

  /** User clicked "Not now" → dismiss silently, call fallback */
  const dismissModal = useCallback(() => {
    setShowModal(false)
    const cbs = pending.current
    pending.current = null
    cbs?.onFallback()
  }, [])

  return { permState, showModal, requestLocation, confirmModal, dismissModal }
}
