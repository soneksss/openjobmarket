"use client"

import { useEffect, useRef } from "react"

export interface TradePin {
  id: string
  name: string
  lat: number
  lon: number
  type: "professional" | "company"
  photoUrl?: string | null
}

interface ManualTradeMapProps {
  lat: number
  lon: number
  tradespeople: TradePin[]
  selected: Set<string>
  focused: string | null
  onToggle: (id: string) => void
  onFocus: (id: string | null) => void
}

declare global { interface Window { L: any } }

export default function ManualTradeMap({
  lat, lon, tradespeople, selected, focused, onToggle, onFocus,
}: ManualTradeMapProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<any>(null)
  const markersRef     = useRef<Map<string, any>>(new Map())

  /* ── init map once ── */
  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet@1"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    const init = () => {
      if (!containerRef.current || mapRef.current) return
      const L = window.L

      const map = L.map(containerRef.current, {
        center: [lat, lon],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      })
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map)
      L.control.zoom({ position: "bottomright" }).addTo(map)
      mapRef.current = map

      /* job location pin */
      const jobIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;
          background:linear-gradient(135deg,#6366f1,#4f46e5);
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          border:3px solid #fff;box-shadow:0 4px 12px rgba(99,102,241,.6);
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:14px">🏠</span>
        </div>`,
        iconSize: [36, 36], iconAnchor: [18, 36], className: "",
      })
      L.marker([lat, lon], { icon: jobIcon }).addTo(map).bindPopup("<b>Your job location</b>")
    }

    if (window.L) { init() } else {
      const s = document.createElement("script")
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      s.onload = init
      document.head.appendChild(s)
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── rebuild markers when tradespeople / selection changes ── */
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    const L   = window.L
    const map = mapRef.current

    /* remove old markers */
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current.clear()

    const bounds: [number, number][] = [[lat, lon]]

    tradespeople.forEach((t) => {
      const isSel      = selected.has(t.id)
      const isFocused  = focused === t.id
      const color      = isSel ? "#10b981" : isFocused ? "#f97316" : "#3b82f6"
      const size       = isSel || isFocused ? 34 : 26
      const glow       = isSel ? `box-shadow:0 0 0 6px rgba(16,185,129,.35),0 2px 10px rgba(0,0,0,.5);`
                       : isFocused ? `box-shadow:0 0 0 6px rgba(249,115,22,.35),0 2px 10px rgba(0,0,0,.5);`
                       : `box-shadow:0 2px 8px rgba(0,0,0,.5);`
      const check      = isSel ? `<span style="position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:9px">✓</span>` : ""
      const border     = isSel ? "border:3px solid #fff;" : "border:2.5px solid rgba(255,255,255,.7);"

      const icon = L.divIcon({
        html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};${border}${glow}display:flex;align-items:center;justify-content:center;transition:all .2s;">
          <span style="font-size:${size < 30 ? 11 : 13}px">${t.type === "company" ? "🏢" : "👤"}</span>
          ${check}
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        className: "",
      })

      const marker = L.marker([t.lat, t.lon], { icon })
        .addTo(map)
        .on("click", () => {
          onToggle(t.id)
          onFocus(t.id)
        })
        .bindPopup(`
          <div style="min-width:140px">
            <b>${t.name}</b><br/>
            <span style="color:${isSel ? '#10b981' : '#64748b'};font-size:12px">${isSel ? "✓ Selected" : "Click to select"}</span>
          </div>
        `)

      markersRef.current.set(t.id, marker)
      bounds.push([t.lat, t.lon])
    })

    /* fit bounds to show all trades + job */
    if (bounds.length > 1) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }) } catch {}
    }
  }, [tradespeople, selected, focused, lat, lon, onToggle, onFocus])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 200, background: "#0f172a" }}
    />
  )
}
