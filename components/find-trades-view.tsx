"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, MessageCircle, Zap, Navigation } from "lucide-react"

interface NearbyTrade {
  id: string
  user_id: string
  company_name: string | null
  logo_url: string | null
  industry: string | null
  services: string[] | null
  location: string | null
  latitude: number | null
  longitude: number | null
  open_for_business: boolean | null
  distanceMiles: number
}

interface FindTradesViewProps {
  trades: NearbyTrade[]
  category: string
  lat: number
  lng: number
  radius: number
  jobId: string | null
  userId: string
}

declare global {
  interface Window { L: any }
}

/* ── tiny Leaflet map ──────────────────────────────────────────────────────── */
function NearbyMap({
  lat, lng, radius, trades,
}: {
  lat: number; lng: number; radius: number; trades: NearbyTrade[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)

  useEffect(() => {
    const init = () => {
      if (!containerRef.current || mapRef.current) return
      const L = window.L
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map)
      L.control.zoom({ position: "bottomright" }).addTo(map)
      mapRef.current = map

      // Radius ring
      L.circle([lat, lng], {
        radius: radius * 1609.34,
        color: "#f97316",
        fillColor: "#f97316",
        fillOpacity: 0.04,
        weight: 1.5,
        dashArray: "8 6",
        opacity: 0.4,
      }).addTo(map)

      // Job location pin
      const jobIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;
          background:linear-gradient(135deg,#f97316,#ea580c);
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          border:3px solid #fff;box-shadow:0 4px 12px rgba(249,115,22,.6);
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:15px">📍</span>
        </div>`,
        iconSize: [36, 36], iconAnchor: [18, 36], className: "",
      })
      L.marker([lat, lng], { icon: jobIcon }).addTo(map)
        .bindPopup("<b>Your location</b>")

      // Trade markers
      trades.forEach((t) => {
        if (!t.latitude || !t.longitude) return
        const online = t.open_for_business
        const color  = online ? "#10b981" : "#64748b"
        const glow   = online ? "rgba(16,185,129,.35)" : "rgba(100,116,139,.25)"
        const pulse  = online ? `animation:ftPulse 1.8s ease-in-out infinite;` : ""
        const icon = L.divIcon({
          html: `<div style="
            width:22px;height:22px;border-radius:50%;
            background:${color};border:2.5px solid #fff;
            box-shadow:0 0 0 4px ${glow},0 2px 6px rgba(0,0,0,.25);${pulse}
          "></div>`,
          iconSize: [22, 22], iconAnchor: [11, 11], className: "",
        })
        const name = t.company_name || "Trade"
        L.marker([t.latitude, t.longitude], { icon }).addTo(map)
          .bindPopup(`<b>${name}</b><br/>${t.distanceMiles.toFixed(1)} mi${online ? " · Online now" : ""}`)
      })

      // Keyframe
      if (!document.getElementById("ft-keyframes")) {
        const style = document.createElement("style")
        style.id = "ft-keyframes"
        style.textContent = `
          @keyframes ftPulse {
            0%,100% { transform: scale(1);    opacity: 1;   }
            50%      { transform: scale(1.3);  opacity: .7; }
          }
        `
        document.head.appendChild(style)
      }
    }

    const loadLeaflet = () => {
      if (window.L) { init(); return }
      if ((window as any).__leafletLoading) {
        const poll = setInterval(() => { if (window.L) { clearInterval(poll); init() } }, 50)
        return
      }
      ;(window as any).__leafletLoading = true
      if (!(window as any).__leafletCssLoaded) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        link.crossOrigin = ""
        link.onload = () => { (window as any).__leafletCssLoaded = true }
        document.head.appendChild(link)
      }
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      script.crossOrigin = ""
      script.onload = () => { ;(window as any).__leafletLoading = false; init() }
      script.onerror = () => { ;(window as any).__leafletLoading = false }
      document.head.appendChild(script)
    }

    loadLeaflet()
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: "#e8f0e8" }}
    />
  )
}

/* ── trade card ────────────────────────────────────────────────────────────── */
function TradeCard({ trade, jobId, category }: { trade: NearbyTrade; jobId: string | null; category: string }) {
  const router = useRouter()
  const name   = trade.company_name || "Trade"
  const online = !!trade.open_for_business

  const handleMessage = () => {
    const params = new URLSearchParams({ to: trade.user_id })
    if (jobId) params.set("job", jobId)
    router.push(`/messages/new?${params}`)
  }

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
      online
        ? "bg-emerald-950/30 border-emerald-500/20 hover:border-emerald-500/40"
        : "bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50"
    }`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-slate-600 overflow-hidden flex items-center justify-center">
          {trade.logo_url ? (
            <img src={trade.logo_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-slate-300">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        {online && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-white truncate">{name}</p>
          {online && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400 truncate">{trade.industry || category || "Tradesperson"}</span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-0.5 text-xs text-slate-500 flex-shrink-0">
            <Navigation className="w-2.5 h-2.5" />
            {trade.distanceMiles.toFixed(1)} mi
          </span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleMessage}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs transition-colors ${
          online
            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
            : "bg-slate-700 hover:bg-slate-600 text-slate-300"
        }`}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {online ? "Message" : "Contact"}
      </button>
    </div>
  )
}

/* ── main view ─────────────────────────────────────────────────────────────── */
export function FindTradesView({
  trades, category, lat, lng, radius, jobId, userId,
}: FindTradesViewProps) {
  const router  = useRouter()
  const online  = trades.filter((t) => t.open_for_business)
  const offline = trades.filter((t) => !t.open_for_business)
  const label   = category || "Trades"

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900 overflow-hidden">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/60 flex-shrink-0 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white tracking-tight truncate">
            {label}s near you
          </p>
          <p className="text-xs text-slate-400">
            within {radius} miles · {online.length} available now
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
          <MapPin className="w-3 h-3" />
          {radius} mi
        </div>
      </div>

      {/* ── MAP ── */}
      <div className="relative flex-shrink-0" style={{ height: "40%" }}>
        <NearbyMap lat={lat} lng={lng} radius={radius} trades={trades} />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-slate-900/85 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Available now
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            Offline
          </span>
        </div>
      </div>

      {/* ── LIST ── */}
      <div className="flex-1 overflow-y-auto pb-safe">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No {label.toLowerCase()}s found nearby</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Try increasing the radius or searching for a broader trade category.
            </p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-2.5">

            {/* Online now section */}
            {online.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                    Online now · {online.length}
                  </span>
                </div>
                {online.map((t) => (
                  <TradeCard key={t.id} trade={t} jobId={jobId} category={category} />
                ))}
              </>
            )}

            {/* Offline section */}
            {offline.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-1 mt-2">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Not active · {offline.length}
                  </span>
                </div>
                {offline.map((t) => (
                  <TradeCard key={t.id} trade={t} jobId={jobId} category={category} />
                ))}
              </>
            )}

            {/* Footer nudge */}
            <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-orange-500/8 border border-orange-500/15">
              <Zap className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Message any trade directly — let them know your job is urgent and they can apply instantly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
