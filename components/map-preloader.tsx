"use client"

/**
 * MapPreloader — mounts a full-viewport Leaflet map off-screen on page load.
 *
 * Purpose: preload Leaflet (CSS + JS) and warm the browser's tile cache BEFORE
 * the user opens the map modal. When the real modal opens, tiles load from the
 * HTTP cache instead of the network → zero delay, zero blue flash.
 *
 * The preloader uses the same singleton guards (`window.__leafletLoading`,
 * `window.__leafletCssLoaded`, `window.L`) as JobMap and ProfessionalMap so
 * only one copy of Leaflet ever loads regardless of how many instances mount.
 */

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer   = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })

interface MapPreloaderProps {
  center: [number, number]
  zoom?: number
}

export function MapPreloader({ center, zoom = 6 }: MapPreloaderProps) {
  const [leafletReady, setLeafletReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadCSS = (): Promise<void> => {
      if ((window as any).__leafletCssLoaded) return Promise.resolve()
      return new Promise(resolve => {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        link.crossOrigin = ""
        link.onload = () => { ;(window as any).__leafletCssLoaded = true; resolve() }
        link.onerror = () => resolve()
        document.head.appendChild(link)
      })
    }

    const loadJS = (): Promise<void> => {
      if ((window as any).L) return Promise.resolve()
      if ((window as any).__leafletLoading) {
        return new Promise(resolve => {
          const poll = setInterval(() => {
            if ((window as any).L) { clearInterval(poll); resolve() }
          }, 50)
        })
      }
      ;(window as any).__leafletLoading = true
      return new Promise(resolve => {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        script.crossOrigin = ""
        script.onload = () => { ;(window as any).__leafletLoading = false; resolve() }
        script.onerror = () => { ;(window as any).__leafletLoading = false; resolve() }
        document.head.appendChild(script)
      })
    }

    Promise.all([loadCSS(), loadJS()]).then(() => setLeafletReady(true))
  }, [])

  if (!leafletReady) return null

  return (
    // Full-viewport sized so Leaflet downloads the same tiles the user will see.
    // Fixed + left:-100vw keeps it completely offscreen and non-interactive.
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: "-100vw",
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: -1,
        opacity: 0,
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        {...({} as any)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          {...({} as any)}
        />
      </MapContainer>
    </div>
  )
}
