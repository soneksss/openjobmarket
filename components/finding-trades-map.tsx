"use client"

import { useEffect, useRef } from "react"

interface TradeMark {
  id: string
  name: string
  distanceMiles: number
  status: "waiting" | "accepted" | "declined"
  lat?: number | null
  lng?: number | null
}

interface FindingTradesMapProps {
  lat: number
  lon: number
  searchRadiusMiles: number
  isExpanding?: boolean
  trades: TradeMark[]
}

declare global {
  interface Window { L: any }
}

export default function FindingTradesMap({
  lat, lon, searchRadiusMiles, isExpanding = false, trades,
}: FindingTradesMapProps) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const mapRef           = useRef<any>(null)
  const radiusCircleRef  = useRef<any>(null)
  const pulseRingRef     = useRef<any>(null)
  const pulseTimerRef    = useRef<any>(null)
  const expandTimerRef   = useRef<any>(null)
  const tradeMarkersRef  = useRef<any[]>([])
  const currentRadiusMRef = useRef(searchRadiusMiles * 1609.34)
  const userMarkerRef    = useRef<any>(null)
  const userLocRef       = useRef<[number, number] | null>(null)

  /* ── initialise map once ── */
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
        center: [lat, lon],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map)
      L.control.zoom({ position: "bottomright" }).addTo(map)
      mapRef.current = map

      /* ── user location dot ── */
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapRef.current) return
            const uLat = pos.coords.latitude
            const uLng = pos.coords.longitude
            userLocRef.current = [uLat, uLng]

            const userIcon = L.divIcon({
              html: `<div style="
                width:14px;height:14px;border-radius:50%;
                background:#2563eb;
                border:2.5px solid #fff;
                box-shadow:0 0 0 4px rgba(37,99,235,0.22),0 2px 6px rgba(0,0,0,.5);
              "></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
              className: "",
            })

            userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon, zIndexOffset: -100 })
              .addTo(mapRef.current)
              .bindPopup("<b>Your location</b>")
          },
          () => {},
          { timeout: 8000, maximumAge: 5 * 60 * 1000 },
        )
      }

      /* ── "My location" re-center button ── */
      const MyLocControl = L.Control.extend({
        options: { position: "bottomleft" },
        onAdd() {
          const btn = L.DomUtil.create("button")
          btn.innerHTML = "📍 My location"
          btn.style.cssText = [
            "background:#1e293b",
            "color:#e2e8f0",
            "border:1px solid #334155",
            "padding:5px 10px",
            "border-radius:8px",
            "font-size:11px",
            "font-weight:500",
            "cursor:pointer",
            "box-shadow:0 2px 8px rgba(0,0,0,.5)",
            "margin-bottom:8px",
            "display:block",
          ].join(";")
          L.DomEvent.on(btn, "click", L.DomEvent.stopPropagation)
          L.DomEvent.on(btn, "click", () => {
            if (userLocRef.current && mapRef.current) {
              mapRef.current.setView(userLocRef.current, Math.max(mapRef.current.getZoom(), 14), { animate: true })
            }
          })
          return btn
        },
      })
      new MyLocControl().addTo(map)

      /* ── job location pin ── */
      const jobIcon = L.divIcon({
        html: `
          <div style="position:relative;width:44px;height:44px;">
            <!-- pulsing halo rings -->
            <div style="
              position:absolute;inset:-10px;border-radius:50%;
              border:2px solid rgba(16,185,129,.35);
              animation:mapPulse 2s ease-out infinite;
            "></div>
            <div style="
              position:absolute;inset:-4px;border-radius:50%;
              border:2px solid rgba(16,185,129,.5);
              animation:mapPulse 2s ease-out infinite 0.6s;
            "></div>
            <!-- pin -->
            <div style="
              width:44px;height:44px;
              background:linear-gradient(135deg,#10b981,#059669);
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              border:3px solid #fff;
              box-shadow:0 4px 14px rgba(16,185,129,.65);
              display:flex;align-items:center;justify-content:center;
            ">
              <span style="transform:rotate(45deg);font-size:18px;line-height:1">🏠</span>
            </div>
          </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
        className: "",
      })
      L.marker([lat, lon], { icon: jobIcon }).addTo(map).bindPopup("<b>Job location</b>")

      const searchRadiusM = searchRadiusMiles * 1609.34
      currentRadiusMRef.current = searchRadiusM

      /* ── dashed boundary ring ── */
      const radiusCircle = L.circle([lat, lon], {
        radius: searchRadiusM,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.04,
        weight: 1.5,
        opacity: 0.3,
        dashArray: "8 6",
      }).addTo(map)
      radiusCircleRef.current = radiusCircle

      /* ── animated pulse ring ── */
      const pulse = L.circle([lat, lon], {
        radius: 400,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.2,
        weight: 2,
        opacity: 0.85,
      }).addTo(map)
      pulseRingRef.current = pulse

      let r = 400
      pulseTimerRef.current = setInterval(() => {
        r += 200
        if (r > searchRadiusM) r = 400
        const fade = Math.max(0.03, 0.85 * (1 - r / searchRadiusM))
        pulse.setRadius(r)
        pulse.setStyle({ opacity: fade, fillOpacity: fade * 0.55 })
      }, 90)
    }

    if (window.L) {
      init()
    } else if ((window as any).__leafletLoading) {
      // Another component is mid-load — poll until ready
      const poll = setInterval(() => {
        if (window.L) { clearInterval(poll); init() }
      }, 50)
    } else {
      ;(window as any).__leafletLoading = true
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      script.crossOrigin = ""
      script.onload = () => { ;(window as any).__leafletLoading = false; init() }
      script.onerror = () => { ;(window as any).__leafletLoading = false }
      document.head.appendChild(script)
    }

    /* inject CSS keyframes for the pin halo */
    if (!document.getElementById("map-keyframes")) {
      const style = document.createElement("style")
      style.id = "map-keyframes"
      style.textContent = `
        @keyframes mapPulse {
          0%   { transform: scale(1);   opacity: .7; }
          100% { transform: scale(2.2); opacity: 0;  }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current)
      if (expandTimerRef.current) clearInterval(expandTimerRef.current)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      userMarkerRef.current = null
      userLocRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── instant circle update when radius changes without expansion ── */
  useEffect(() => {
    if (isExpanding || !radiusCircleRef.current) return
    const targetM = searchRadiusMiles * 1609.34
    radiusCircleRef.current.setRadius(targetM)
    currentRadiusMRef.current = targetM
    // reset pulse ring so it doesn't overshoot the new boundary
    if (pulseRingRef.current) pulseRingRef.current.setRadius(400)
  }, [searchRadiusMiles, isExpanding])

  /* ── animate radius expansion when isExpanding changes ── */
  useEffect(() => {
    if (!isExpanding || !radiusCircleRef.current) return
    const targetM = searchRadiusMiles * 1609.34
    const startM  = currentRadiusMRef.current
    const steps   = 60
    let  step     = 0

    if (expandTimerRef.current) clearInterval(expandTimerRef.current)

    expandTimerRef.current = setInterval(() => {
      step++
      const t = step / steps
      const ease = 1 - Math.pow(1 - t, 3)          // ease-out cubic
      const r = startM + (targetM - startM) * ease
      radiusCircleRef.current.setRadius(r)
      currentRadiusMRef.current = r

      // also speed-up the pulse ring to the new max
      if (pulseRingRef.current && pulseRingRef.current.getRadius() > r) {
        pulseRingRef.current.setRadius(400)
      }

      if (step >= steps) {
        clearInterval(expandTimerRef.current)
        currentRadiusMRef.current = targetM
      }
    }, 80)

    return () => { if (expandTimerRef.current) clearInterval(expandTimerRef.current) }
  }, [isExpanding, searchRadiusMiles])

  /* ── trade markers ── */
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    const L   = window.L
    const map = mapRef.current

    tradeMarkersRef.current.forEach((m) => map.removeLayer(m))
    tradeMarkersRef.current = []

    trades.forEach((trade, i) => {
      // Use real GPS coordinates if available, otherwise estimate from distance
      let tLat: number, tLon: number
      if (trade.lat && trade.lng) {
        tLat = trade.lat
        tLon = trade.lng
      } else {
        const angle = (i / Math.max(trades.length, 1)) * 2 * Math.PI + Math.PI / 6
        const distM = Math.min(trade.distanceMiles * 1609.34 * 0.55, currentRadiusMRef.current * 0.75)
        tLat = lat + (distM / 111320) * Math.cos(angle)
        tLon = lon + (distM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle)
      }

      const color  = trade.status === "accepted" ? "#10b981"
                   : trade.status === "declined"  ? "#ef4444"
                   :                               "#f59e0b"

      const glowColor = color + "55"
      const pulse  = trade.status === "waiting"
        ? `animation:tradePulse 1.6s ease-in-out infinite;`
        : ""

      const icon = L.divIcon({
        html: `<div style="
          width:26px;height:26px;border-radius:50%;
          background:${color};border:3px solid #1e293b;
          box-shadow:0 0 0 5px ${glowColor},0 2px 8px rgba(0,0,0,.5);
          ${pulse}
        "></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        className: "",
      })

      const m = L.marker([tLat, tLon], { icon }).addTo(map)
        .bindPopup(`<b>${trade.name}</b><br/>${trade.distanceMiles.toFixed(1)} mi away`)
      tradeMarkersRef.current.push(m)
    })

    /* inject trade-pulse keyframe once */
    if (!document.getElementById("trade-keyframes")) {
      const style = document.createElement("style")
      style.id = "trade-keyframes"
      style.textContent = `
        @keyframes tradePulse {
          0%,100% { transform: scale(1);    opacity: 1;   }
          50%      { transform: scale(1.25); opacity: .75; }
        }
      `
      document.head.appendChild(style)
    }
  }, [trades, lat, lon])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 200, background: "#0f172a" }}
    />
  )
}
