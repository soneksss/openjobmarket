"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Home, ExternalLink } from "lucide-react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false })
const TileLayer    = dynamic(() => import("react-leaflet").then((m) => m.TileLayer),    { ssr: false })
const Circle       = dynamic(() => import("react-leaflet").then((m) => m.Circle),       { ssr: false })
const ZoomControl  = dynamic(() => import("react-leaflet").then((m) => m.ZoomControl),  { ssr: false })

const MapReady = dynamic(
  () => import("react-leaflet").then((m) => {
    const { useMap } = m
    function MapReadyInner() {
      const map = useMap()
      useEffect(() => { map.whenReady(() => map.invalidateSize({ pan: false })) }, [map])
      return null
    }
    return MapReadyInner
  }),
  { ssr: false },
)

// Fly to new center when confirmed (MapContainer ignores center prop after mount)
const MapViewUpdater = dynamic(
  () => Promise.all([import("react-leaflet"), import("react")]).then(([m, r]) => {
    const { useMap } = m
    const { useEffect, useRef } = r
    function MapViewUpdaterInner({ center, zoom }: { center: [number, number]; zoom: number }) {
      const map = useMap()
      const prev = useRef<[number, number]>(center)
      useEffect(() => {
        const [pLat, pLon] = prev.current
        const [lat, lon] = center
        if (Math.abs(lat - pLat) > 0.0001 || Math.abs(lon - pLon) > 0.0001) {
          prev.current = center
          map.flyTo(center, zoom, { animate: true, duration: 0.8 })
        }
      }, [map, center, zoom])
      return null
    }
    return MapViewUpdaterInner
  }),
  { ssr: false },
)

interface JobLocationMapProps {
  approxLatitude: number
  approxLongitude: number
  exactLatitude?: number | null
  exactLongitude?: number | null
  applicationStatus?: string | null
  homeownerAddressLine1?: string | null
  homeownerCity?: string | null
  homeownerPostcode?: string | null
}

export function JobLocationMap({
  approxLatitude,
  approxLongitude,
  exactLatitude,
  exactLongitude,
  applicationStatus,
  homeownerAddressLine1,
  homeownerCity,
  homeownerPostcode,
}: JobLocationMapProps) {
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const cssLoaded = useRef(false)

  const isConfirmed = applicationStatus === "CONFIRMED" || applicationStatus === "JOB_COMPLETED"
  const hasExact = isConfirmed && exactLatitude && exactLongitude

  const displayLat = hasExact ? exactLatitude! : approxLatitude
  const displayLon = hasExact ? exactLongitude! : approxLongitude
  const center: [number, number] = [displayLat, displayLon]
  const zoom = hasExact ? 16 : 13
  const radius = hasExact ? 30 : 800

  // Full address string for confirmed state
  const addressParts = [homeownerAddressLine1, homeownerCity, homeownerPostcode].filter(Boolean)
  const fullAddress = addressParts.join(", ")
  const mapsQuery = encodeURIComponent(fullAddress || `${displayLat},${displayLon}`)

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadCSS = (): Promise<void> => {
      if (cssLoaded.current || (window as any).__leafletCssLoaded) { cssLoaded.current = true; return Promise.resolve() }
      return new Promise((resolve) => {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        link.crossOrigin = ""
        link.onload = () => { ;(window as any).__leafletCssLoaded = true; cssLoaded.current = true; resolve() }
        link.onerror = () => resolve()
        document.head.appendChild(link)
      })
    }

    const loadJS = (): Promise<void> => {
      if ((window as any).L) return Promise.resolve()
      if ((window as any).__leafletLoading) {
        return new Promise((resolve) => {
          const poll = setInterval(() => { if ((window as any).L) { clearInterval(poll); resolve() } }, 50)
        })
      }
      ;(window as any).__leafletLoading = true
      return new Promise((resolve) => {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        script.crossOrigin = ""
        script.onload = () => { ;(window as any).__leafletLoading = false; resolve() }
        script.onerror = () => { ;(window as any).__leafletLoading = false; resolve() }
        document.head.appendChild(script)
      })
    }

    Promise.all([loadCSS(), loadJS()]).then(() => setLeafletLoaded(true))
  }, [])

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/60">

      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700/60">
        <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${hasExact ? "text-emerald-400" : "text-slate-400"}`} />
        <span className="text-xs font-medium text-slate-300">
          {hasExact ? "Exact job location" : "Approximate location"}
        </span>
        {!isConfirmed && (
          <span className="text-xs text-slate-500 ml-auto">Exact address shared after job confirmation</span>
        )}
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 220 }}>
        {!leafletLoaded && <div className="absolute inset-0 bg-slate-800 animate-pulse" />}
        {leafletLoaded && (
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: "100%", width: "100%", background: "#1e293b" }}
            zoomControl={false}
            dragging={!hasExact}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={hasExact}
            keyboard={false}
            {...({} as any)}
          >
            <ZoomControl position="bottomright" {...({} as any)} />
            <MapReady />
            <MapViewUpdater center={center} zoom={zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              {...({} as any)}
            />
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: hasExact ? "#10b981" : "#64748b",
                fillColor: hasExact ? "#10b981" : "#64748b",
                fillOpacity: hasExact ? 0.25 : 0.10,
                weight: hasExact ? 2 : 1.5,
              }}
              {...({} as any)}
            />
          </MapContainer>
        )}
      </div>

      {/* Confirmed: reveal full address + Open in Maps link */}
      {isConfirmed && fullAddress && (
        <div className="flex items-start justify-between gap-3 px-3 py-3 bg-emerald-900/20 border-t border-emerald-700/40">
          <div className="flex items-start gap-2">
            <Home className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-300 leading-relaxed">
              {homeownerAddressLine1 && <p className="font-medium">{homeownerAddressLine1}</p>}
              {homeownerCity && <p>{homeownerCity}</p>}
              {homeownerPostcode && <p>{homeownerPostcode}</p>}
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0 mt-0.5"
          >
            <ExternalLink className="h-3 w-3" />
            Maps
          </a>
        </div>
      )}

      {/* Confirmed but no structured address available */}
      {isConfirmed && !fullAddress && homeownerPostcode && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-900/20 border-t border-emerald-700/40">
          <Home className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-emerald-300">{homeownerPostcode}</span>
        </div>
      )}
    </div>
  )
}
