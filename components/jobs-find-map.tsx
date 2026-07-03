"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TRADE_INDUSTRIES } from "@/lib/data/trade-industries"
import { getIndustryStyle, getIndustryPinColor, getIndustryPinSvg } from "@/lib/data/industry-styles"
import { ArrowLeft, MapPin, Briefcase, SlidersHorizontal, X, Check, Clock, Banknote, Search, Users, LocateFixed, Loader2 } from "lucide-react"
import { MapSearchBar } from "@/components/map-search-bar"

// ── Leaflet dynamic imports ────────────────────────────────────────────────────
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false })
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false })
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false })
const ZoomControl  = dynamic(() => import("react-leaflet").then(m => m.ZoomControl),  { ssr: false })
const Circle       = dynamic(() => import("react-leaflet").then(m => m.Circle),       { ssr: false })

const MapSizeHandler = dynamic(
  () => import("react-leaflet").then(mod => {
    const { useMap } = mod
    function Comp() {
      const map = useMap()
      useEffect(() => {
        if (!map) return
        map.whenReady(() => map.invalidateSize({ pan: false }))
        const obs = new ResizeObserver(() => map.invalidateSize())
        obs.observe(map.getContainer())
        return () => obs.disconnect()
      }, [map])
      return null
    }
    return Comp
  }),
  { ssr: false }
)

const MapViewUpdater = dynamic(
  () => Promise.all([import("react-leaflet"), import("react")]).then(([lm, rm]) => {
    const { useMap } = lm
    const { useEffect, useRef } = rm
    function Comp({ center }: { center: [number, number] }) {
      const map = useMap()
      const prev = useRef(center)
      useEffect(() => {
        const [pLat, pLon] = prev.current
        const [lat, lon] = center
        if (Math.abs(lat - pLat) > 0.001 || Math.abs(lon - pLon) > 0.001) {
          prev.current = center
          map.flyTo(center, map.getZoom(), { animate: true, duration: 0.6 })
        }
      }, [map, center])
      return null
    }
    return Comp
  }),
  { ssr: false }
)

const ViewportLoader = dynamic(
  () => Promise.all([import("react-leaflet"), import("react")]).then(([lm, rm]) => {
    const { useMap, useMapEvents } = lm
    const { useEffect } = rm
    function Comp({ onBoundsChange }: { onBoundsChange: (b: BBox) => void }) {
      const map = useMap()
      const emit = () => {
        const b = map.getBounds()
        onBoundsChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() })
      }
      useEffect(() => { emit() }, [])
      useMapEvents({ moveend: emit, zoomend: emit })
      return null
    }
    return Comp
  }),
  { ssr: false }
)

// Starts the map zoomed out to UK level then smoothly flies in to the target location
const ZoomInOnLoad = dynamic(
  () => Promise.all([import("react-leaflet"), import("react")]).then(([lm, rm]) => {
    const { useMap } = lm
    const { useEffect } = rm
    function Comp({ target }: { target: [number, number] }) {
      const map = useMap()
      useEffect(() => {
        const t = setTimeout(() => {
          map.flyTo(target, 12, { animate: true, duration: 2.2, easeLinearity: 0.15 })
        }, 350)
        return () => clearTimeout(t)
      }, []) // eslint-disable-line react-hooks/exhaustive-deps
      return null
    }
    return Comp
  }),
  { ssr: false }
)

// ── Job pin ────────────────────────────────────────────────────────────────────
function createJobIcon(L: any, isSelected: boolean, industry?: string | null) {
  const color    = getIndustryPinColor(industry)
  const size     = isSelected ? 44 : 36
  const pinBg    = isSelected ? color : "#0f172a"
  const iconClr  = isSelected ? "#ffffff" : color
  const iconSize = Math.round(size * 0.50)
  const svg      = getIndustryPinSvg(industry, iconClr, iconSize)
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${pinBg};border:2.5px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4),0 0 0 4px ${color}30">${svg}</div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -(size/2+4)],
  })
}

// ── Static data ────────────────────────────────────────────────────────────────
const BUDGET_OPTIONS = [
  { label: "Any", value: "" },
  { label: "< £500", value: "0-500" },
  { label: "£500–1k", value: "500-1k" },
  { label: "£1k–5k", value: "1k-5k" },
  { label: "£5k+", value: "5k+" },
]
const URGENCY_OPTIONS = [
  { label: "Any", value: "" },
  { label: "Flexible", value: "flexible" },
  { label: "Urgent / ASAP", value: "asap" },
]

// ── Types & session persistence ───────────────────────────────────────────────
type BBox = { north: number; south: number; east: number; west: number }
type Poster = { first_name: string; last_name: string; profile_photo_url: string | null; user_id: string } | null
type Job = {
  id: string
  title: string
  short_description: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  latitude_approx: number | null
  longitude_approx: number | null
  location_type: string | null
  budget_min: number | null
  budget_max: number | null
  urgency_type: string | null
  job_photo_url: string | null
  industry: string | null
  category: string | null
  created_at: string
  homeowner_profiles: Poster
}

type SheetState = "collapsed" | "peek" | "expanded"
type Filters = { industry: string | null; budget: string; urgency: string }
const DEFAULT_FILTERS: Filters = { industry: null, budget: "", urgency: "" }

const JOBS_FILTERS_KEY = "find-jobs-filters"
function loadSavedFilters(initIndustry?: string): Filters {
  const defaults: Filters = { ...DEFAULT_FILTERS, industry: initIndustry ?? null }
  if (typeof window === "undefined") return defaults
  try {
    const saved = JSON.parse(sessionStorage.getItem(JOBS_FILTERS_KEY) ?? "null")
    if (!saved) return defaults
    return {
      industry: initIndustry ?? saved.industry ?? null,
      budget:   saved.budget  ?? "",
      urgency:  saved.urgency ?? "",
    }
  } catch { return defaults }
}

type Props = {
  initialJobs: Job[]
  initialCoords: [number, number]
  initialPostcode?: string
  initialIndustry?: string
  animateZoom?: boolean
  coordsAreDefault?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null
  const fmt = (n: number) => n >= 1000 ? `£${(n/1000).toFixed(n%1000===0?0:1)}k` : `£${n}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (max) return `Up to ${fmt(max)}`
  return `From ${fmt(min!)}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  if (h < 1) return "Just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d/7)}w ago`
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function JobsFindMap({ initialJobs, initialCoords, initialPostcode, initialIndustry, animateZoom, coordsAreDefault }: Props) {
  const router = useRouter()

  const [jobs,            setJobs]            = useState<Job[]>(initialJobs)
  const [filters,         setFilters]         = useState<Filters>(() => loadSavedFilters(initialIndustry))
  const [draftFilters,    setDraftFilters]    = useState<Filters>(() => loadSavedFilters(initialIndustry))
  const [sheetState,      setSheetState]      = useState<SheetState>("peek")
  const [selectedJob,     setSelectedJob]     = useState<Job | null>(null)
  const [showFilters,     setShowFilters]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [mounted,         setMounted]         = useState(false)
  const [leafletL,        setLeafletL]        = useState<any>(null)
  const [lightboxIndex,   setLightboxIndex]   = useState<number | null>(null)
  const [coords,          setCoords]          = useState<[number, number]>(initialCoords)
  const [locationLabel,   setLocationLabel]   = useState(initialPostcode || "Nearby")
  const [postcodeInput,   setPostcodeInput]   = useState("")
  const [geocoding,       setGeocoding]       = useState(false)
  const [locating,        setLocating]        = useState(false)

  const touchStartY      = useRef<number | null>(null)
  const currentBoundsRef = useRef<BBox | null>(null)
  const fetchTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersRef       = useRef<Filters>(loadSavedFilters(initialIndustry))

  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setMounted(true)
    import("leaflet").then(mod => setLeafletL(mod.default ?? mod))
    const style = document.createElement("style")
    style.id = "find-jobs-zoom-offset"
    const isLg = window.matchMedia("(min-width: 1024px)").matches
    style.textContent = `#find-jobs-map .leaflet-top { margin-top: ${isLg ? "160px" : "110px"}; }`
    if (!document.getElementById("find-jobs-zoom-offset")) document.head.appendChild(style)
    return () => { document.getElementById("find-jobs-zoom-offset")?.remove() }
  }, [])

  // Auto-request geolocation on first load when no explicit location was supplied
  useEffect(() => {
    if (!coordsAreDefault) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords([pos.coords.latitude, pos.coords.longitude])
        setLocationLabel("My location")
      },
      () => { /* denied or unavailable — stay on London default */ },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", h)
    return () => mq.removeEventListener("change", h)
  }, [])

  const fetchByViewport = useCallback((bbox: BBox | null, f: Filters) => {
    if (!bbox) return
    currentBoundsRef.current = bbox
    filtersRef.current = f
    sessionStorage.setItem(JOBS_FILTERS_KEY, JSON.stringify(f))
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    fetchTimerRef.current = setTimeout(async () => {
      const b = currentBoundsRef.current!
      const ff = filtersRef.current
      setLoading(true)
      try {
        const params = new URLSearchParams({
          north: String(b.north), south: String(b.south),
          east:  String(b.east),  west:  String(b.west),
        })
        if (ff.industry) params.set("industry", ff.industry)
        if (ff.urgency)  params.set("urgency",  ff.urgency)
        if (ff.budget)   params.set("budget",   ff.budget)
        const res = await fetch(`/api/jobs?${params}`)
        if (res.ok) setJobs(await res.json())
      } finally { setLoading(false) }
    }, 600)
  }, [])

  const onBoundsChange = useCallback((b: BBox) => {
    fetchByViewport(b, filtersRef.current)
  }, [fetchByViewport])

  const applyFilters = async () => {
    let didGeocode = false
    const q = postcodeInput.trim()
    if (q) {
      setGeocoding(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=gb`,
          { headers: { "User-Agent": "OpenJobMarket/1.0" } }
        )
        const data = await res.json()
        if (data?.[0]) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
          setLocationLabel(q.toUpperCase())
          didGeocode = true
        }
      } catch { }
      finally { setGeocoding(false) }
    }
    setFilters(draftFilters)
    filtersRef.current = draftFilters
    sessionStorage.setItem(JOBS_FILTERS_KEY, JSON.stringify(draftFilters))
    setShowFilters(false)
    if (!didGeocode && currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, draftFilters)
  }

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords([pos.coords.latitude, pos.coords.longitude])
        setLocationLabel("My location")
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 20000, maximumAge: 300000, enableHighAccuracy: false }
    )
  }, [])
  const clearFilters = () => {
    const r = { ...DEFAULT_FILTERS }
    setDraftFilters(r); setFilters(r); filtersRef.current = r; setShowFilters(false)
    fetchByViewport(currentBoundsRef.current, r)
  }
  const hasActiveFilters = filters.industry !== null || filters.budget !== "" || filters.urgency !== ""

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = touchStartY.current - e.changedTouches[0].clientY
    touchStartY.current = null
    if (Math.abs(dy) < 25) return
    if (dy > 0) setSheetState(p => p === "collapsed" ? "peek" : "expanded")
    else        setSheetState(p => p === "expanded"   ? "peek" : "collapsed")
  }

  const distanceMi = (lat: number, lon: number) => {
    const R = 3959, dLat = (lat - coords[0]) * Math.PI/180, dLon = (lon - coords[1]) * Math.PI/180
    const a = Math.sin(dLat/2)**2 + Math.cos(coords[0]*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)
  }

  // Use approx coords for map markers to protect homeowner privacy.
  // Fall back to exact coords only if approx are not yet computed (legacy jobs).
  const jobMarkerCoords = (j: Job): [number, number] | null => {
    if (j.latitude_approx && j.longitude_approx) return [j.latitude_approx, j.longitude_approx]
    if (j.latitude && j.longitude) return [j.latitude, j.longitude]
    return null
  }
  const jobsWithCoords = jobs.filter(j => jobMarkerCoords(j) !== null)
  // Desktop HEADER = 44px layout header + 96px map overlay ≈ 140px
  const HEADER = isDesktop ? "140px" : "96px"

  const mobileSheetStyle: React.CSSProperties =
    sheetState === "expanded" ? { top: HEADER, bottom: "56px", left: 0, right: 0 } :
    sheetState === "peek"     ? { bottom: "56px", left: 0, right: 0, height: "48vh" } :
                                { bottom: "56px", left: 0, right: 0, height: "160px" }

  const jobPhotos = selectedJob?.job_photo_url ? [{ id: selectedJob.id, photo_url: selectedJob.job_photo_url }] : []

  /* ── Shared panel content ─────────────────────────────────────────────── */
  const detailPanel = selectedJob && (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {selectedJob.job_photo_url ? (
        <button onClick={() => setLightboxIndex(0)} className="w-full h-40 overflow-hidden flex-shrink-0 focus:outline-none">
          <img src={selectedJob.job_photo_url} alt={selectedJob.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
        </button>
      ) : (
        <div className="mx-3 mt-1 h-20 rounded-xl bg-slate-800 flex items-center justify-center gap-2">
          {(() => { const s = getIndustryStyle(selectedJob.industry ?? ""); const I = s.icon; return <span className={`w-16 h-16 rounded-2xl ${s.iconBg} flex items-center justify-center`}><I className={`w-8 h-8 ${s.iconColor}`} /></span> })()}
          <span className="text-slate-400 text-xs">No photo</span>
        </div>
      )}
      <div className="px-4 pt-3 pb-2">
        <h3 className="text-sm font-bold text-white leading-snug">{selectedJob.title}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {formatBudget(selectedJob.budget_min, selectedJob.budget_max) && (
            <span className="flex items-center gap-1 text-xs font-semibold text-indigo-300">
              <Banknote className="w-3.5 h-3.5" />{formatBudget(selectedJob.budget_min, selectedJob.budget_max)}
            </span>
          )}
          {selectedJob.urgency_type && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selectedJob.urgency_type === "asap" ? "bg-red-500/20 text-red-300" : "bg-slate-700 text-slate-300"}`}>
              {selectedJob.urgency_type === "asap" ? "Urgent / ASAP" : selectedJob.urgency_type.charAt(0).toUpperCase() + selectedJob.urgency_type.slice(1)}
            </span>
          )}
          {(selectedJob.latitude_approx ?? selectedJob.latitude) && (selectedJob.longitude_approx ?? selectedJob.longitude) && (
            <span className="text-[10px] text-slate-500">
              {distanceMi(selectedJob.latitude_approx ?? selectedJob.latitude!, selectedJob.longitude_approx ?? selectedJob.longitude!)} mi away
              {selectedJob.location_type === 'approx' && " (approx)"}
            </span>
          )}
          {selectedJob.location_type === 'approx' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">~ Approximate</span>
          )}
          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />{timeAgo(selectedJob.created_at)}
          </span>
        </div>
        {selectedJob.industry && (
          <p className="text-[10px] text-slate-500 mt-1">{selectedJob.industry}{selectedJob.category ? ` · ${selectedJob.category}` : ""}</p>
        )}
        {selectedJob.short_description && (
          <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-3">{selectedJob.short_description}</p>
        )}
        {selectedJob.homeowner_profiles && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
              {selectedJob.homeowner_profiles.profile_photo_url
                ? <img src={selectedJob.homeowner_profiles.profile_photo_url} alt="" className="w-full h-full object-cover" />
                : <span className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">{selectedJob.homeowner_profiles.first_name?.[0] ?? "?"}</span>}
            </div>
            <span className="text-xs text-slate-400">
              Posted by <span className="text-white font-medium">{selectedJob.homeowner_profiles.first_name} {selectedJob.homeowner_profiles.last_name}</span>
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2 px-4 pb-4 pt-1">
        <button onClick={() => router.push(`/jobs/${selectedJob.id}`)}
          className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-colors">
          View &amp; Apply
        </button>
        {selectedJob.homeowner_profiles?.user_id && (
          <button onClick={() => router.push(`/messages/${selectedJob.homeowner_profiles!.user_id}`)}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm rounded-xl transition-colors">
            Message
          </button>
        )}
      </div>
    </div>
  )

  const listPanel = (
    <>
      <div className="flex-shrink-0 px-3 pt-2 pb-1.5">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Briefcase className="w-3 h-3 text-indigo-400" />
          {filters.industry && (() => {
            const s = getIndustryStyle(filters.industry); const I = s.icon
            return <span className={`w-4 h-4 rounded flex items-center justify-center ${s.iconBg}`}><I className={`w-2.5 h-2.5 ${s.iconColor}`} /></span>
          })()}
          {filters.industry ? `${filters.industry} jobs` : "Jobs nearby"}
          {!loading && <span className="text-slate-500 font-normal ml-1">({jobs.length})</span>}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-400 text-xs">No jobs found in this area.</p>
          </div>
        ) : jobs.map(job => (
          <div key={job.id} onClick={() => setSelectedJob(p => p?.id === job.id ? null : job)}
            className="flex items-start gap-2.5 px-2 py-2 rounded-xl border cursor-pointer transition-all bg-slate-800 border-slate-700 active:bg-slate-700">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
              {job.job_photo_url
                ? <img src={job.job_photo_url} alt={job.title} className="w-full h-full object-cover rounded-lg" />
                : (() => { const s = getIndustryStyle(job.industry ?? ""); const I = s.icon; return <span className={`w-full h-full rounded-lg ${s.iconBg} flex items-center justify-center`}><I className={`w-4.5 h-4.5 ${s.iconColor}`} /></span> })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{job.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {formatBudget(job.budget_min, job.budget_max) && (
                  <span className="text-[10px] font-semibold text-indigo-300">{formatBudget(job.budget_min, job.budget_max)}</span>
                )}
                {(job.latitude_approx ?? job.latitude) && (job.longitude_approx ?? job.longitude) && (
                  <span className="text-[10px] text-slate-500">
                    {distanceMi(job.latitude_approx ?? job.latitude!, job.longitude_approx ?? job.longitude!)} mi
                    {job.location_type === 'approx' && <span className="text-slate-600"> ~</span>}
                  </span>
                )}
                {job.urgency_type === "asap" && <span className="text-[10px] font-medium text-red-400">Urgent</span>}
                <span className="text-[10px] text-slate-600">{timeAgo(job.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  /* ── Filter panel ─────────────────────────────────────────────────────── */
  const filterPanel = showFilters && (
    <div className="fixed inset-0" style={{ zIndex: 80 }}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(2,6,23,0.65)" }} onClick={() => setShowFilters(false)} />
      <div className="absolute rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden"
        style={{
          top: HEADER, bottom: isDesktop ? "max(env(safe-area-inset-bottom,0px),10px)" : "calc(3.5rem + max(env(safe-area-inset-bottom,0px),8px))",
          left: isDesktop ? "50%" : "12px", right: isDesktop ? "auto" : "12px",
          transform: isDesktop ? "translateX(-50%)" : undefined,
          width: isDesktop ? "420px" : undefined,
          backgroundColor: "#0f172a", zIndex: 81,
        }}>
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-bold text-white">Filters</span>
          <div className="flex items-center gap-3">
            {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-white">Clear all</button>}
            <button onClick={() => setShowFilters(false)} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location</p>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-indigo-500/60 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <input
                value={postcodeInput}
                onChange={e => setPostcodeInput(e.target.value)}
                placeholder="Postcode or town…"
                autoComplete="off"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none min-w-0"
              />
              {postcodeInput.trim() && (
                <button onClick={() => setPostcodeInput("")} className="flex-shrink-0 text-slate-500 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="mx-3 border-t border-slate-800/80 mb-1" />
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Trade / Industry</p>
            {[{ title: "All trades" } as const, ...TRADE_INDUSTRIES].map((ind, i) => {
              const isAll = i === 0
              const active = isAll ? draftFilters.industry === null : draftFilters.industry === ind.title
              const style = isAll ? null : getIndustryStyle(ind.title)
              const Icon = style?.icon ?? null
              return (
                <button key={ind.title}
                  onClick={() => setDraftFilters(f => ({ ...f, industry: isAll ? null : (f.industry === ind.title ? null : ind.title) }))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1 border text-left transition-colors ${active ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-slate-800 border-slate-700/60 text-slate-300"}`}>
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isAll ? "bg-slate-700" : (active ? "bg-white/10" : style!.iconBg)}`}>
                    {isAll ? <Search className="w-3 h-3 text-slate-300" /> : Icon && <Icon className={`w-3 h-3 ${active ? "text-indigo-300" : style!.iconColor}`} />}
                  </span>
                  <span className="flex-1 text-xs font-medium">{ind.title}</span>
                  {active && <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Budget</p>
            <div className="flex flex-wrap gap-1.5">
              {BUDGET_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDraftFilters(f => ({ ...f, budget: opt.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${draftFilters.budget === opt.value ? "bg-indigo-500 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 pt-2 pb-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Urgency</p>
            <div className="flex flex-wrap gap-1.5">
              {URGENCY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDraftFilters(f => ({ ...f, urgency: opt.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${draftFilters.urgency === opt.value ? "bg-indigo-500 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 px-3 py-3 border-t border-slate-800">
          <button onClick={applyFilters} disabled={geocoding}
            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-70 text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
            {geocoding ? <><Loader2 className="w-4 h-4 animate-spin" /> Locating…</> : "Search"}
          </button>
        </div>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col lg:flex-row">

      {/* ── LEFT: Map area (full on mobile, flex-1 on desktop) ──────────────── */}
      <div className="relative flex-1 min-h-0">

        {/* Map */}
        {mounted && (
          <div id="find-jobs-map" className="absolute inset-0" style={{ zIndex: 0 }}>
            <MapContainer center={coords} zoom={animateZoom ? 5 : 11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <ZoomControl position="topright" />
              <MapSizeHandler />
              <MapViewUpdater center={coords} />
              <ViewportLoader onBoundsChange={onBoundsChange} />
              {animateZoom && <ZoomInOnLoad target={coords} />}
              {leafletL && jobsWithCoords.map(job => {
                const pos = jobMarkerCoords(job)!
                const isApprox = job.location_type === 'approx' || (job.latitude_approx !== null && job.latitude_approx !== job.latitude)
                return (
                  <React.Fragment key={job.id}>
                    {isApprox && (
                      <Circle center={pos} radius={350}
                        pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.10, weight: 1, opacity: 0.4 }} />
                    )}
                    <Marker position={pos}
                      icon={createJobIcon(leafletL, selectedJob?.id === job.id, job.industry) as any}
                      eventHandlers={{ click: () => setSelectedJob(p => p?.id === job.id ? null : job) }}>
                      <Popup>
                        <b className="text-sm">{job.title}</b>
                        {isApprox && <div className="text-xs text-indigo-500 mt-0.5">~ Approximate location</div>}
                        {job.industry && <div className="text-xs text-gray-500">{job.industry}</div>}
                        {formatBudget(job.budget_min, job.budget_max) && (
                          <div className="text-xs text-emerald-600 font-semibold">{formatBudget(job.budget_min, job.budget_max)}</div>
                        )}
                      </Popup>
                    </Marker>
                  </React.Fragment>
                )
              })}
            </MapContainer>
          </div>
        )}

        {/* Home button — desktop only, top-left corner of map */}
        <Link href="/home"
          className="absolute left-3 hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/95 border border-slate-700 text-white text-xs font-semibold shadow-md hover:bg-slate-700 hover:border-slate-500 transition-colors"
          style={{ zIndex: 200, top: "60px" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Home
        </Link>

        {/* Header — absolute within map column, centered on desktop */}
        <div className="absolute top-0 left-0 right-0 flex flex-col gap-1.5 px-3 py-2"
          style={{ zIndex: 20, paddingTop: isDesktop ? "52px" : "max(env(safe-area-inset-top,0px),8px)" }}>
          {/* Tab switcher */}
          <div className="flex self-center bg-slate-800/95 border border-slate-700/80 rounded-full p-0.5 shadow-lg backdrop-blur-sm">
            <button
              onClick={() => router.push(`/find?lat=${coords[0]}&lng=${coords[1]}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <Users className="w-3 h-3" />
              Tradespeople
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500 text-white shadow-sm">
              <Briefcase className="w-3 h-3" />
              Trade Jobs
            </button>
          </div>
          {/* Search row */}
          <div className="flex items-center gap-2 lg:w-80 lg:self-center">
            <MapSearchBar
              loading={loading}
              label={filters.industry ?? null}
              count={jobs.length}
              countSuffix="jobs"
              accentColor="orange"
              onClick={() => { setDraftFilters(filters); setPostcodeInput(""); setShowFilters(true) }}
            />
            <button onClick={handleMyLocation} disabled={locating} title="My location"
              className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800/95 border border-slate-700 flex items-center justify-center shadow-md hover:border-slate-500 hover:text-orange-400 transition-colors text-slate-400">
              {locating
                ? <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                : <LocateFixed className="w-3 h-3" />}
            </button>
          </div>{/* end search row */}
        </div>{/* end header */}
      </div>

      {/* ── RIGHT: Desktop sidebar ──────────────────────────────────────────── */}
      {isDesktop && (
        <div className="hidden lg:flex flex-col w-[420px] flex-shrink-0 border-l border-slate-700 overflow-hidden"
          style={{ backgroundColor: "#0f172a", zIndex: 30 }}>
          {/* Chrome */}
          <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-800"
            style={{ paddingTop: "max(env(safe-area-inset-top,0px),10px)" }}>
            {selectedJob ? (
              <button onClick={() => setSelectedJob(null)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-medium">All jobs</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 min-w-0">
                {filters.industry && (() => {
                  const s = getIndustryStyle(filters.industry); const I = s.icon
                  return <span className={`w-4 h-4 rounded flex items-center justify-center ${s.iconBg} flex-shrink-0`}><I className={`w-2.5 h-2.5 ${s.iconColor}`} /></span>
                })()}
                <span className="truncate">{filters.industry ? `${filters.industry} jobs` : "Jobs nearby"}</span>
                {!loading && <span className="text-slate-500 font-normal flex-shrink-0">({jobs.length})</span>}
              </span>
            )}
            <button onClick={() => { setDraftFilters(filters); setShowFilters(true) }}
              className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center relative transition-colors ${hasActiveFilters ? "bg-indigo-500 border-indigo-400 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
              <SlidersHorizontal className="w-3 h-3" />
              {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full border border-slate-800" />}
            </button>
          </div>
          {selectedJob ? detailPanel : listPanel}
        </div>
      )}

      {/* ── MOBILE: Bottom sheet ─────────────────────────────────────────────── */}
      {!isDesktop && (
        <div className="fixed rounded-t-3xl shadow-2xl border-t border-x border-slate-700/50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{ ...mobileSheetStyle, zIndex: 30, backgroundColor: "#0f172a" }}>
          <div className="flex-shrink-0 flex items-center justify-between px-3 pt-2 pb-1 cursor-grab select-none"
            onClick={() => {
              if (selectedJob) { setSelectedJob(null); return }
              setSheetState(p => p === "collapsed" ? "peek" : p === "peek" ? "expanded" : "peek")
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}>
            {selectedJob ? (
              <>
                <button className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" /><span className="text-xs">All jobs</span>
                </button>
                <div className="w-10 h-1 rounded-full bg-slate-600 absolute left-1/2 -translate-x-1/2" />
                <div className="w-20" />
              </>
            ) : (
              <div className="w-full flex justify-center">
                <div className="w-10 h-1 rounded-full bg-slate-600" />
              </div>
            )}
          </div>
          {selectedJob ? detailPanel : listPanel}
        </div>
      )}

      {/* ── Overlays ─────────────────────────────────────────────────────────── */}
      {filterPanel}

      {lightboxIndex !== null && jobPhotos.length > 0 && (
        <JobLightbox
          photos={jobPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(0)}
          onNext={() => setLightboxIndex(0)}
        />
      )}
    </div>
  )
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
function JobLightbox({ photos, index, onClose, onPrev, onNext }: {
  photos: { id: string; photo_url: string }[]
  index: number; onClose: () => void; onPrev: () => void; onNext: () => void
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 70, background: "rgba(0,0,0,0.95)" }}>
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white z-10">
        <X className="w-5 h-5" />
      </button>
      <img src={photos[index].photo_url} alt="Job photo" className="max-w-full max-h-full object-contain select-none" draggable={false} />
    </div>
  )
}
