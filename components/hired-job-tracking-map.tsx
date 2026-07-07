"use client"

import { useEffect, useRef } from "react"

interface HiredJobTrackingMapProps {
  jobLat: number
  jobLon: number
  tradeLat: number | null
  tradeLon: number | null
  tradeName: string
}

declare global {
  interface Window { L: any }
}

export default function HiredJobTrackingMap({
  jobLat, jobLon, tradeLat, tradeLon, tradeName,
}: HiredJobTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)

  useEffect(() => {
    if (!(window as any).__leafletCssLoaded) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      link.crossOrigin = ""
      link.onload = () => { (window as any).__leafletCssLoaded = true }
      document.head.appendChild(link)
    }

    const init = () => {
      if (!containerRef.current || mapRef.current) return
      const L = window.L

      const map = L.map(containerRef.current, {
        center: [jobLat, jobLon],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      })

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, subdomains: "abcd" }
      ).addTo(map)

      L.control.zoom({ position: "bottomright" }).addTo(map)
      mapRef.current = map

      /* Job location pin (house) */
      const jobPin = L.divIcon({
        html: `
          <div style="position:relative;width:48px;height:48px;">
            <div style="position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(16,185,129,.25);animation:htmPulse 2.4s ease-out infinite;"></div>
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 18px rgba(16,185,129,.42);display:flex;align-items:center;justify-content:center;">
              <span style="transform:rotate(45deg);font-size:20px;line-height:1">🏠</span>
            </div>
          </div>`,
        iconSize: [48, 48], iconAnchor: [24, 48], className: "",
      })
      L.marker([jobLat, jobLon], { icon: jobPin }).addTo(map)
        .bindPopup("<b>Job location</b>")

      /* Tradesperson van marker */
      const hasTradeLoc = tradeLat != null && tradeLon != null
      const tLat = hasTradeLoc ? tradeLat! : jobLat + 0.008
      const tLon = hasTradeLoc ? tradeLon! : jobLon + 0.006

      const vanPin = L.divIcon({
        html: `
          <div style="position:relative;width:52px;height:52px;">
            <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(249,115,22,.18);animation:htmPulse 2s ease-out infinite 0.4s;"></div>
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ea580c);border:3px solid #fff;box-shadow:0 4px 18px rgba(249,115,22,.45);display:flex;align-items:center;justify-content:center;font-size:24px;line-height:1;">
              🚐
            </div>
          </div>`,
        iconSize: [52, 52], iconAnchor: [26, 26], className: "",
      })
      L.marker([tLat, tLon], { icon: vanPin }).addTo(map)
        .bindPopup(`<b>${tradeName}</b><br/><span style="color:#f97316;font-weight:600">Hired ✓</span>`)

      /* Blue GPS dot for current user */
      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapRef.current) return
            const [uLat, uLng] = [pos.coords.latitude, pos.coords.longitude]
            const icon = L.divIcon({
              html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 0 0 5px rgba(37,99,235,.18),0 1px 6px rgba(0,0,0,.25);"></div>`,
              iconSize: [14, 14], iconAnchor: [7, 7], className: "",
            })
            L.marker([uLat, uLng], { icon, zIndexOffset: -100 }).addTo(mapRef.current)
              .bindPopup("<b>Your location</b>")
          },
          () => {},
          { timeout: 8000, maximumAge: 300_000 }
        )
      }

      /* Fit bounds to show both markers */
      const bounds = L.latLngBounds([[jobLat, jobLon], [tLat, tLon]])
      map.fitBounds(bounds.pad(0.35), { maxZoom: 15 })

      setTimeout(() => { mapRef.current?.invalidateSize() }, 200)
    }

    if (!document.getElementById("htm-keyframes")) {
      const style = document.createElement("style")
      style.id = "htm-keyframes"
      style.textContent = `
        @keyframes htmPulse {
          0%   { transform: scale(1);   opacity: .8; }
          100% { transform: scale(2.6); opacity: 0;  }
        }
      `
      document.head.appendChild(style)
    }

    if (window.L) { init() }
    else if ((window as any).__leafletLoading) {
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); init() } }, 50)
    } else {
      ;(window as any).__leafletLoading = true
      const s = document.createElement("script")
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      s.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      s.crossOrigin = ""
      s.onload = () => { ;(window as any).__leafletLoading = false; init() }
      s.onerror = () => { ;(window as any).__leafletLoading = false }
      document.head.appendChild(s)
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: "#e8ecf0", position: "relative", zIndex: 0 }}
    />
  )
}
