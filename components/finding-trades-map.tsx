"use client"

import { useEffect, useRef } from "react"
import { isLocationGranted } from "@/hooks/use-location-permission"

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
  alertedCount?: number
}

declare global {
  interface Window { L: any }
}

function makeAmbientPositions(lat: number, lon: number, radiusM: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + i * 0.85
    const frac  = 0.22 + ((i * 41 + 7) % 100) / 100 * 0.62
    const dist  = radiusM * frac
    return {
      lat: lat + (dist / 111_320) * Math.cos(angle),
      lon: lon + (dist / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle),
    }
  })
}

export default function FindingTradesMap({
  lat, lon, searchRadiusMiles, isExpanding = false, trades, alertedCount = 0,
}: FindingTradesMapProps) {
  const containerRef      = useRef<HTMLDivElement>(null)
  const mapRef            = useRef<any>(null)
  const radiusCircleRef   = useRef<any>(null)
  const pulseRingRef      = useRef<any>(null)
  const pulseTimerRef     = useRef<any>(null)
  const expandTimerRef    = useRef<any>(null)
  const tradeMarkersRef   = useRef<any[]>([])
  const ambientMarkersRef = useRef<any[]>([])
  const currentRadiusMRef = useRef(searchRadiusMiles * 1609.34)
  const userLocRef        = useRef<[number, number] | null>(null)

  /* ── Map initialization ─────────────────────────────────────── */
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

      /* Uber-style light/grey map tiles */
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, subdomains: "abcd" }
      ).addTo(map)

      L.control.zoom({ position: "bottomright" }).addTo(map)
      mapRef.current = map

      /* User location dot */
      if (navigator?.geolocation && isLocationGranted()) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapRef.current) return
            const [uLat, uLng] = [pos.coords.latitude, pos.coords.longitude]
            userLocRef.current = [uLat, uLng]
            const icon = L.divIcon({
              html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 0 0 5px rgba(37,99,235,.18),0 1px 6px rgba(0,0,0,.25);"></div>`,
              iconSize: [14, 14], iconAnchor: [7, 7], className: "",
            })
            L.marker([uLat, uLng], { icon, zIndexOffset: -100 })
              .addTo(mapRef.current).bindPopup("<b>Your location</b>")
          },
          () => {}, { timeout: 8000, maximumAge: 300_000 },
        )
      }

      /* "My location" re-center button */
      const MyLocControl = L.Control.extend({
        options: { position: "bottomleft" },
        onAdd() {
          const btn = L.DomUtil.create("button")
          btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`
          btn.title = "My location"
          btn.style.cssText = "width:34px;height:34px;background:#fff;border:1.5px solid #e2e8f0;border-radius:9px;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.14);margin-bottom:44px;display:flex;align-items:center;justify-content:center;"
          L.DomEvent.on(btn, "click", L.DomEvent.stopPropagation)
          L.DomEvent.on(btn, "click", () => {
            if (userLocRef.current && mapRef.current)
              mapRef.current.setView(userLocRef.current, Math.max(mapRef.current.getZoom(), 14), { animate: true })
          })
          return btn
        },
      })
      new MyLocControl().addTo(map)

      /* Job location pin */
      const jobPin = L.divIcon({
        html: `
          <div style="position:relative;width:48px;height:48px;">
            <div style="position:absolute;inset:-14px;border-radius:50%;border:2px solid rgba(16,185,129,.22);animation:ftmPulse 2.4s ease-out infinite;"></div>
            <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(16,185,129,.38);animation:ftmPulse 2.4s ease-out infinite 0.8s;"></div>
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 18px rgba(16,185,129,.42);display:flex;align-items:center;justify-content:center;">
              <span style="transform:rotate(45deg);font-size:20px;line-height:1">🏠</span>
            </div>
          </div>`,
        iconSize: [48, 48], iconAnchor: [24, 48], className: "",
      })
      L.marker([lat, lon], { icon: jobPin }).addTo(map).bindPopup("<b>Job location</b>")

      const searchRadiusM = searchRadiusMiles * 1609.34
      currentRadiusMRef.current = searchRadiusM

      /* Boundary ring (dashed) */
      const radiusCircle = L.circle([lat, lon], {
        radius: searchRadiusM, color: "#10b981", fillColor: "#10b981",
        fillOpacity: 0.05, weight: 2, opacity: 0.4, dashArray: "9 6",
      }).addTo(map)
      radiusCircleRef.current = radiusCircle

      /* Animated sonar pulse ring */
      const pulse = L.circle([lat, lon], {
        radius: 280, color: "#10b981", fillColor: "#10b981",
        fillOpacity: 0.1, weight: 2.5, opacity: 0.6,
      }).addTo(map)
      pulseRingRef.current = pulse

      let r = 280
      pulseTimerRef.current = setInterval(() => {
        r += 160
        if (r > searchRadiusM) r = 280
        const fade = Math.max(0.01, 0.6 * (1 - r / searchRadiusM))
        pulse.setRadius(r)
        pulse.setStyle({ opacity: fade, fillOpacity: fade * 0.4 })
      }, 85)

      /* Ambient nearby tradesperson dots */
      const positions = makeAmbientPositions(lat, lon, searchRadiusM, 9)
      const dots: any[] = []
      positions.forEach((p, i) => {
        const dur = (2.6 + i * 0.18).toFixed(2)
        const delay = (i * 0.28).toFixed(2)
        const icon = L.divIcon({
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#94a3b8;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.18);animation:ftmDrift ${dur}s ease-in-out ${delay}s infinite alternate;opacity:.7;"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5], className: "",
        })
        const m = L.marker([p.lat, p.lon], { icon, interactive: false, zIndexOffset: -50 }).addTo(map)
        dots.push(m)
      })
      ambientMarkersRef.current = dots
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

    /* CSS keyframes for this map */
    if (!document.getElementById("ftm-keyframes")) {
      const style = document.createElement("style")
      style.id = "ftm-keyframes"
      style.textContent = `
        @keyframes ftmPulse {
          0%   { transform: scale(1);   opacity: .75; }
          100% { transform: scale(2.8); opacity: 0;   }
        }
        @keyframes ftmDrift {
          0%   { transform: translate(0,0) scale(1);       }
          100% { transform: translate(4px,-5px) scale(1.2); }
        }
        @keyframes ftmTradePulse {
          0%,100% { transform: scale(1);   opacity: 1;   }
          50%     { transform: scale(1.32); opacity: .72; }
        }
        @keyframes ftmAcceptGlow {
          0%,100% { box-shadow: 0 0 0 4px rgba(16,185,129,.3), 0 2px 8px rgba(0,0,0,.2); }
          50%     { box-shadow: 0 0 0 8px rgba(16,185,129,.15), 0 2px 10px rgba(0,0,0,.2); }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      if (pulseTimerRef.current)  clearInterval(pulseTimerRef.current)
      if (expandTimerRef.current) clearInterval(expandTimerRef.current)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Radius update (non-expanding) ─────────────────────────── */
  useEffect(() => {
    if (isExpanding || !radiusCircleRef.current) return
    const m = searchRadiusMiles * 1609.34
    radiusCircleRef.current.setRadius(m)
    currentRadiusMRef.current = m
    if (pulseRingRef.current) pulseRingRef.current.setRadius(280)
  }, [searchRadiusMiles, isExpanding])

  /* ── Animated expansion ─────────────────────────────────────── */
  useEffect(() => {
    if (!isExpanding || !radiusCircleRef.current) return
    const targetM = searchRadiusMiles * 1609.34
    const startM  = currentRadiusMRef.current
    let step = 0
    if (expandTimerRef.current) clearInterval(expandTimerRef.current)
    expandTimerRef.current = setInterval(() => {
      step++
      const ease = 1 - Math.pow(1 - step / 60, 3)
      const r    = startM + (targetM - startM) * ease
      radiusCircleRef.current.setRadius(r)
      currentRadiusMRef.current = r
      if (pulseRingRef.current && pulseRingRef.current.getRadius() > r)
        pulseRingRef.current.setRadius(280)
      if (step >= 60) { clearInterval(expandTimerRef.current); currentRadiusMRef.current = targetM }
    }, 80)
    return () => { if (expandTimerRef.current) clearInterval(expandTimerRef.current) }
  }, [isExpanding, searchRadiusMiles])

  /* ── Ambient dot visibility (fade out when trades appear) ────── */
  useEffect(() => {
    const hide = trades.length > 0 || alertedCount > 0
    ambientMarkersRef.current.forEach((m) => {
      try {
        if (m._icon) {
          m._icon.style.opacity = hide ? "0" : "0.7"
          m._icon.style.transition = "opacity 0.7s ease"
        }
      } catch {}
    })
  }, [trades.length, alertedCount])

  /* ── Trade markers ───────────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    const L = window.L, map = mapRef.current

    tradeMarkersRef.current.forEach((m) => map.removeLayer(m))
    tradeMarkersRef.current = []

    trades.forEach((trade, i) => {
      let tLat: number, tLon: number
      if (trade.lat && trade.lng) {
        tLat = trade.lat; tLon = trade.lng
      } else {
        const angle = (i / Math.max(trades.length, 1)) * 2 * Math.PI + Math.PI / 6
        const distM = Math.min(trade.distanceMiles * 1609.34 * 0.55, currentRadiusMRef.current * 0.75)
        tLat = lat + (distM / 111_320) * Math.cos(angle)
        tLon = lon + (distM / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle)
      }

      const isAcc = trade.status === "accepted"
      const isDec = trade.status === "declined"
      const color = isAcc ? "#10b981" : isDec ? "#ef4444" : "#f59e0b"
      const sz    = isAcc ? 34 : 26

      const checkmark = isAcc
        ? `<svg style="position:absolute;inset:0;margin:auto;width:13px;height:13px" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
        : ""

      const glowAnim  = isAcc ? "animation:ftmAcceptGlow 2s ease-in-out infinite;" : ""
      const pulseAnim = !isAcc && !isDec ? "animation:ftmTradePulse 1.8s ease-in-out infinite;" : ""

      const outerGlow = isAcc
        ? `<div style="position:absolute;inset:-9px;border-radius:50%;background:rgba(16,185,129,.18);animation:ftmTradePulse 2.2s ease-in-out infinite;"></div>`
        : ""

      const icon = L.divIcon({
        html: `<div style="position:relative;width:${sz}px;height:${sz}px;">
          ${outerGlow}
          <div style="position:relative;width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:${isAcc ? 3 : 2.5}px solid #fff;${glowAnim || pulseAnim}">
            ${checkmark}
          </div>
        </div>`,
        iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], className: "",
      })

      const label = isAcc ? "Applied ✓" : isDec ? "Unavailable" : "Notified"
      const m = L.marker([tLat, tLon], { icon }).addTo(map)
        .bindPopup(`<b>${trade.name}</b><br/>${trade.distanceMiles.toFixed(1)} mi away<br/><span style="color:${color};font-weight:600">${label}</span>`)
      tradeMarkersRef.current.push(m)
    })
  }, [trades, lat, lon])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: "#e8ecf0" }}
    />
  )
}
